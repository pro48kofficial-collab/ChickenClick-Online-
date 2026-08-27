const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Віддаємо index.html напряму з кореня (без папки public)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const users = {}; 
const clans = {}; 
let pvpQueue = [];

io.on('connection', (socket) => {
    socket.on('login', ({ id }) => {
        socket.userId = id;
        if (!users[id]) {
            users[id] = {
                id,
                username: 'Курчатко_' + id.substr(0,4),
                color: '#fff',
                coins: 0,
                cups: 0,
                totalEarned: 0,
                totalSpent: 0,
                wins: 0,
                skin: 'default',
                inventory: ['default'],
                friends: [],
                clan: null,
                dailyStreak: 0,
                lastDaily: 0
            };
        }
        checkTop1(users[id]);
        socket.emit('init_data', users[id]);
        updateClanData(socket);
    });

    socket.on('click_chicken', () => {
        const u = users[socket.userId];
        if (!u) return;
        checkTop1(u);
        const add = u.isTop1 ? 0.2 : 0.1;
        u.coins = parseFloat((u.coins + add).toFixed(2));
        u.totalEarned = parseFloat((u.totalEarned + add).toFixed(2));
        socket.emit('sync_user', u);
    });

    socket.on('update_profile', ({ username, color }) => {
        const u = users[socket.userId];
        if (!u) return;
        u.username = username.substr(0, 15);
        u.color = color;
        socket.emit('sync_user', u);
    });

    socket.on('reset_progress', () => {
        const u = users[socket.userId];
        if (!u) return;
        u.coins = 0;
        u.cups = 0;
        u.totalEarned = 0;
        u.totalSpent = 0;
        u.wins = 0;
        u.inventory = ['default'];
        u.skin = 'default';
        socket.emit('sync_user', u);
    });

    socket.on('redeem_promo', (code) => {
        const u = users[socket.userId];
        if (!u) return;
        const clean = code.toUpperCase().trim();
        if (clean === 'CK') {
            u.coins += 10;
            u.totalEarned += 10;
            socket.emit('promo_res', { success: true, text: 'Успіх! +10 коінів' });
            socket.emit('sync_user', u);
        } else {
            socket.emit('promo_res', { success: false, text: 'Невірний промокод або код автора!' });
        }
    });

    socket.on('claim_daily', () => {
        const u = users[socket.userId];
        if (!u) return;
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        if (now - u.lastDaily < dayMs && u.lastDaily !== 0) {
            socket.emit('promo_res', { success: false, text: 'Щоденна нагорода вже отримана сьогодні!' });
            return;
        }
        u.dailyStreak++;
        const reward = u.dailyStreak * 10;
        u.coins += reward;
        u.totalEarned += reward;
        u.lastDaily = now;
        socket.emit('promo_res', { success: true, text: `Отримано щоденну нагороду: +${reward} 🪙!` });
        socket.emit('sync_user', u);
    });

    socket.on('get_top', () => {
        const list = Object.values(users).sort((a,b) => b.cups - a.cups).slice(0, 100);
        socket.emit('top_data', list);
    });

    socket.on('add_friend', (friendId) => {
        const u = users[socket.userId];
        if (u && users[friendId] && !u.friends.includes(friendId) && friendId !== u.id) {
            u.friends.push(friendId);
            socket.emit('friends_data', u.friends.map(id => ({ username: users[id].username, online: true })));
        }
    });
    socket.on('get_friends', () => {
        const u = users[socket.userId];
        if (!u) return;
        const fList = u.friends.map(id => ({ username: users[id] ? users[id].username : 'Невідомий', online: true }));
        socket.emit('friends_data', fList);
    });

    socket.on('create_clan', (name) => {
        const u = users[socket.userId];
        if (!u || u.coins < 5000 || u.clan) return;
        u.coins -= 5000;
        u.totalSpent += 5000;
        clans[name] = { name, owner: u.id, members: [u.id], messages: [] };
        u.clan = name;
        updateClanData(socket);
        socket.emit('sync_user', u);
    });

    socket.on('clan_msg', (text) => {
        const u = users[socket.userId];
        if (!u || !u.clan || !clans[u.clan]) return;
        clans[u.clan].messages.push({ user: u.username, text });
        io.to(u.clan).emit('clan_status', clans[u.clan]);
    });

    function updateClanData(s) {
        const u = users[s.userId];
        if (u && u.clan && clans[u.clan]) {
            s.join(u.clan);
            s.emit('clan_status', clans[u.clan]);
        } else {
            s.emit('clan_status', null);
        }
    }

    socket.on('buy_skin', ({ id, price }) => {
        const u = users[socket.userId];
        if (!u || u.coins < price || u.inventory.includes(id)) return;
        u.coins -= price;
        u.totalSpent += price;
        u.inventory.push(id);
        socket.emit('sync_user', u);
        socket.emit('init_data', u);
    });
    socket.on('equip_skin', (id) => {
        const u = users[socket.userId];
        if (u && u.inventory.includes(id)) {
            u.skin = id;
            socket.emit('sync_user', u);
            socket.emit('init_data', u);
        }
    });

    socket.on('find_pvp', () => {
        if (pvpQueue.includes(socket.userId)) return;
        if (pvpQueue.length > 0) {
            const oppId = pvpQueue.shift();
            const oppSocket = io.sockets.sockets.get(oppId);
            if (oppSocket) {
                const room = 'pvp_' + socket.userId + '_' + oppId;
                socket.join(room);
                oppSocket.join(room);

                const match = {
                    p1: socket.userId,
                    p2: oppId,
                    scores: { [socket.userId]: 0, [oppId]: 0 },
                    time: 120
                };

                io.to(room).emit('pvp_started');

                const interval = setInterval(() => {
                    match.time--;
                    io.to(room).emit('pvp_timer_tick', match.time);
                    io.to(room).emit('pvp_score_update', match.scores);

                    if (match.time <= 0) {
                        clearInterval(interval);
                        let winner = null;
                        if (match.scores[match.p1] > match.scores[match.p2]) winner = match.p1;
                        else if (match.scores[match.p2] > match.scores[match.p1]) winner = match.p2;

                        io.to(room).emit('pvp_ended', { winner });

                        if (winner) {
                            const winUser = users[winner];
                            if (winUser) {
                                checkTop1(winUser);
                                winUser.cups += winUser.isTop1 ? 10 : 5;
                                winUser.wins = (winUser.wins || 0) + 1;
                            }
                        }
                    }
                }, 1000);

                socket.on('pvp_click', () => { match.scores[socket.userId]++; });
                oppSocket.on('pvp_click', () => { match.scores[oppId]++; });
            }
        } else {
            pvpQueue.push(socket.userId);
        }
    });

    socket.on('disconnect', () => {
        pvpQueue = pvpQueue.filter(id => id !== socket.userId);
    });
});

function checkTop1(user) {
    const list = Object.values(users).sort((a,b) => b.cups - a.cups);
    if (list.length > 0 && list[0].id === user.id) {
        user.isTop1 = true;
    } else {
        user.isTop1 = false;
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер успішно запущено на порту ${PORT}!`);
});
