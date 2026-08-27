const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

/* =========================
   POSTGRESQL
========================= */

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});


/* =========================
   STATIC FILES
========================= */

app.use(express.static(__dirname));


/* =========================
   DATABASE SETUP
========================= */

async function setupDatabase() {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS players (
            id TEXT PRIMARY KEY,
            nickname TEXT NOT NULL DEFAULT 'ChickenPlayer',
            nickname_color TEXT NOT NULL DEFAULT '#ffffff',

            coins DOUBLE PRECISION NOT NULL DEFAULT 0,
            clicks BIGINT NOT NULL DEFAULT 0,
            trophies INTEGER NOT NULL DEFAULT 0,

            earned_coins DOUBLE PRECISION NOT NULL DEFAULT 0,
            spent_coins DOUBLE PRECISION NOT NULL DEFAULT 0,

            inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
            active_skin INTEGER,

            friends JSONB NOT NULL DEFAULT '[]'::jsonb,

            clan_id TEXT,

            used_promos JSONB NOT NULL DEFAULT '[]'::jsonb,

            daily_day INTEGER NOT NULL DEFAULT 1,
            last_daily BIGINT NOT NULL DEFAULT 0
        );
    `);


    await pool.query(`
        CREATE TABLE IF NOT EXISTS clans (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            owner TEXT NOT NULL,

            members JSONB NOT NULL DEFAULT '[]'::jsonb,

            trophies INTEGER NOT NULL DEFAULT 0,

            created_at BIGINT NOT NULL DEFAULT 0
        );
    `);


    console.log("PostgreSQL database готова!");
}


/* =========================
   PLAYER FUNCTIONS
========================= */

function createPlayer(id) {

    return {
        id,

        nickname: "ChickenPlayer",
        nicknameColor: "#ffffff",

        coins: 0,
        clicks: 0,
        trophies: 0,

        earnedCoins: 0,
        spentCoins: 0,

        inventory: [],
        activeSkin: null,

        friends: [],

        clanId: null,

        usedPromos: [],

        dailyDay: 1,
        lastDaily: 0
    };

}


function convertPlayer(row) {

    if (!row) return null;

    return {

        id: row.id,

        nickname: row.nickname,

        nicknameColor: row.nickname_color,

        coins: Number(row.coins),

        clicks: Number(row.clicks),

        trophies: Number(row.trophies),

        earnedCoins:
            Number(row.earned_coins),

        spentCoins:
            Number(row.spent_coins),

        inventory:
            Array.isArray(row.inventory)
                ? row.inventory
                : [],

        activeSkin:
            row.active_skin,

        friends:
            Array.isArray(row.friends)
                ? row.friends
                : [],

        clanId:
            row.clan_id,

        usedPromos:
            Array.isArray(row.used_promos)
                ? row.used_promos
                : [],

        dailyDay:
            Number(row.daily_day),

        lastDaily:
            Number(row.last_daily)
    };

}


async function getPlayer(id) {

    const result = await pool.query(
        `
        SELECT *
        FROM players
        WHERE id = $1
        `,
        [id]
    );


    if (result.rows.length > 0) {

        return convertPlayer(
            result.rows[0]
        );

    }


    const player =
        createPlayer(id);


    await savePlayer(player);


    return player;
}


async function savePlayer(player) {

    await pool.query(
        `
        INSERT INTO players (
            id,
            nickname,
            nickname_color,

            coins,
            clicks,
            trophies,

            earned_coins,
            spent_coins,

            inventory,
            active_skin,

            friends,

            clan_id,

            used_promos,

            daily_day,
            last_daily
        )

        VALUES (

            $1, $2, $3,

            $4, $5, $6,

            $7, $8,

            $9, $10,

            $11,

            $12,

            $13,

            $14, $15
        )

        ON CONFLICT (id)

        DO UPDATE SET

            nickname = EXCLUDED.nickname,

            nickname_color =
                EXCLUDED.nickname_color,

            coins = EXCLUDED.coins,

            clicks = EXCLUDED.clicks,

            trophies = EXCLUDED.trophies,

            earned_coins =
                EXCLUDED.earned_coins,

            spent_coins =
                EXCLUDED.spent_coins,

            inventory =
                EXCLUDED.inventory,

            active_skin =
                EXCLUDED.active_skin,

            friends =
                EXCLUDED.friends,

            clan_id =
                EXCLUDED.clan_id,

            used_promos =
                EXCLUDED.used_promos,

            daily_day =
                EXCLUDED.daily_day,

            last_daily =
                EXCLUDED.last_daily
        `,

        [

            player.id,

            player.nickname,

            player.nicknameColor,

            player.coins,

            player.clicks,

            player.trophies,

            player.earnedCoins,

            player.spentCoins,

            JSON.stringify(
                player.inventory
            ),

            player.activeSkin,

            JSON.stringify(
                player.friends
            ),

            player.clanId,

            JSON.stringify(
                player.usedPromos
            ),

            player.dailyDay,

            player.lastDaily
        ]
    );

}


/* =========================
   TOP BONUS
========================= */

async function getMultiplier(playerId) {

    const result =
        await pool.query(
            `
            SELECT id
            FROM players

            ORDER BY
                trophies DESC,
                clicks DESC

            LIMIT 1
            `
        );


    if (
        result.rows.length > 0 &&
        result.rows[0].id === playerId
    ) {

        return 2;

    }


    return 1;
}


/* =========================
   TOP PLAYERS
========================= */

async function sendTopPlayers() {

    const result =
        await pool.query(
            `
            SELECT
                id,
                nickname,
                nickname_color,
                trophies,
                clicks

            FROM players

            ORDER BY
                trophies DESC,
                clicks DESC

            LIMIT 100
            `
        );


    const players =
        result.rows.map(
            player => ({

                id: player.id,

                nickname:
                    player.nickname,

                nicknameColor:
                    player.nickname_color,

                trophies:
                    Number(player.trophies),

                clicks:
                    Number(player.clicks)

            })
        );


    io.emit(
        "topPlayers",
        players
    );

}


/* =========================
   TOP CLANS
========================= */

async function sendTopClans() {

    const result =
        await pool.query(
            `
            SELECT *
            FROM clans

            ORDER BY
                trophies DESC

            LIMIT 100
            `
        );


    const clans =
        result.rows.map(
            clan => ({

                id:
                    clan.id,

                name:
                    clan.name,

                owner:
                    clan.owner,

                members:
                    clan.members,

                trophies:
                    Number(
                        clan.trophies
                    )

            })
        );


    io.emit(
        "topClans",
        clans
    );

}


/* =========================
   PVP DATA
========================= */

const waitingPlayers = [];

const pvpMatches =
    new Map();


function removeFromQueue(playerId) {

    const index =
        waitingPlayers.findIndex(
            player =>
                player.playerId === playerId
        );


    if (index !== -1) {

        waitingPlayers.splice(
            index,
            1
        );

    }

}


/* =========================
   FINISH PVP
========================= */

async function finishPvp(roomId) {

    const match =
        pvpMatches.get(roomId);


    if (!match) return;


    if (!match.active) return;


    match.active = false;


    const ids =
        Object.keys(
            match.players
        );


    if (ids.length !== 2) {

        pvpMatches.delete(
            roomId
        );

        return;

    }


    const player1 = ids[0];

    const player2 = ids[1];


    const score1 =
        match.players[player1];


    const score2 =
        match.players[player2];


    let winner = null;


    if (score1 > score2) {

        winner = player1;

    }


    if (score2 > score1) {

        winner = player2;

    }


    if (winner) {

        const player =
            await getPlayer(
                winner
            );


        const multiplier =
            await getMultiplier(
                winner
            );


        player.trophies +=
            5 * multiplier;


        await savePlayer(
            player
        );


        /*
        КУБКИ КЛАНУ
        */

        if (player.clanId) {

            await pool.query(
                `
                UPDATE clans

                SET trophies =
                    trophies + $1

                WHERE id = $2
                `,

                [
                    5 * multiplier,
                    player.clanId
                ]
            );

        }

    }


    io.to(roomId).emit(
        "pvpEnd",
        {
            winner,
            scores:
                match.players
        }
    );


    pvpMatches.delete(
        roomId
    );


    await sendTopPlayers();

    await sendTopClans();

}


/* =========================
   SOCKET CONNECTION
========================= */

io.on(
    "connection",

    socket => {

        console.log(
            "Новий гравець:",
            socket.id
        );


        let playerId = null;


        /* =========================
           LOGIN
        ========================= */

        socket.on(
            "login",

            async id => {

                try {

                    if (
                        !id ||
                        typeof id !== "string"
                    ) {

                        return;

                    }


                    playerId = id;


                    const player =
                        await getPlayer(
                            playerId
                        );


                    socket.emit(
                        "playerData",
                        player
                    );


                    await sendTopPlayers();

                }

                catch (error) {

                    console.error(
                        error
                    );

                }

            }
        );


        /* =========================
           CHICKEN CLICK
        ========================= */

        socket.on(
            "clickChicken",

            async () => {

                try {

                    if (!playerId) return;


                    const player =
                        await getPlayer(
                            playerId
                        );


                    const multiplier =
                        await getMultiplier(
                            playerId
                        );


                    const reward =
                        0.1 *
                        multiplier;


                    player.coins +=
                        reward;


                    player.earnedCoins +=
                        reward;


                    player.clicks += 1;


                    await savePlayer(
                        player
                    );


                    socket.emit(
                        "playerData",
                        player
                    );

                }

                catch (error) {

                    console.error(
                        "Помилка кліку:",
                        error
                    );

                }

            }
        );


        /* =========================
           NICKNAME
        ========================= */

        socket.on(
            "changeNickname",

            async data => {

                try {

                    if (!playerId) return;


                    const player =
                        await getPlayer(
                            playerId
                        );


                    const nickname =
                        String(
                            data.nickname ||
                            ""
                        )
                        .trim()
                        .slice(0, 20);


                    if (
                        nickname.length < 3
                    ) {

                        socket.emit(
                            "errorMessage",

                            "Нік має бути мінімум 3 символи!"
                        );

                        return;

                    }


                    player.nickname =
                        nickname;


                    player.nicknameColor =
                        data.color ||
                        "#ffffff";


                    await savePlayer(
                        player
                    );


                    socket.emit(
                        "playerData",
                        player
                    );


                    await sendTopPlayers();

                }

                catch (error) {

                    console.error(error);

                }

            }
        );


        /* =========================
           PROMOCODES
        ========================= */

        socket.on(
            "usePromo",

            async code => {

                try {

                    if (!playerId) return;


                    const player =
                        await getPlayer(
                            playerId
                        );


                    code =
                        String(
                            code || ""
                        )
                        .trim()
                        .toUpperCase();


                    if (
                        player.usedPromos
                        .includes(code)
                    ) {

                        socket.emit(
                            "errorMessage",

                            "Цей промокод вже використано!"
                        );

                        return;

                    }


                    let reward = 0;


                    if (
                        code === "CK"
                    ) {

                        reward = 10;

                    }


                    /*
                    КОД АВТОРА
                    ЗМІНИ НА СВІЙ,
                    ЯКЩО ПОТРІБНО
                    */

                    if (
                        code === "PRO48K"
                    ) {

                        reward = 50;

                    }


                    if (reward <= 0) {

                        socket.emit(
                            "errorMessage",

                            "Невірний промокод!"
                        );

                        return;

                    }


                    player.coins +=
                        reward;


                    player.earnedCoins +=
                        reward;


                    player.usedPromos.push(
                        code
                    );


                    await savePlayer(
                        player
                    );


                    socket.emit(
                        "playerData",
                        player
                    );


                    socket.emit(
                        "successMessage",

                        "+" +
                        reward +
                        " 🪙"
                    );

                }

                catch (error) {

                    console.error(error);

                }

            }
        );


        /* =========================
           DAILY REWARD
        ========================= */

        socket.on(
            "claimDaily",

            async () => {

                try {

                    if (!playerId) return;


                    const player =
                        await getPlayer(
                            playerId
                        );


                    const now =
                        Date.now();


                    const oneDay =
                        24 *
                        60 *
                        60 *
                        1000;


                    if (

                        player.lastDaily > 0 &&

                        now -
                        player.lastDaily
                        <
                        oneDay

                    ) {

                        socket.emit(
                            "errorMessage",

                            "Сьогодні нагороду вже отримано!"
                        );

                        return;

                    }


                    const reward =
                        player.dailyDay *
                        10;


                    player.coins +=
                        reward;


                    player.earnedCoins +=
                        reward;


                    player.dailyDay +=
                        1;


                    player.lastDaily =
                        now;


                    await savePlayer(
                        player
                    );


                    socket.emit(
                        "playerData",
                        player
                    );


                    socket.emit(
                        "successMessage",

                        "Щоденна нагорода: +" +
                        reward +
                        " 🪙"
                    );

                }

                catch (error) {

                    console.error(error);

                }

            }
        );


        

        /* =========================
           ADD FRIEND
        ========================= */

        socket.on(
            "addFriend",

            async friendId => {

                try {

                    if (!playerId) return;


                    friendId =
                        String(
                            friendId || ""
                        )
                        .trim();


                    if (
                        friendId ===
                        playerId
                    ) {

                        socket.emit(
                            "errorMessage",

                            "Не можна додати себе!"
                        );

                        return;

                    }


                    const result =
                        await pool.query(
                            `
                            SELECT id

                            FROM players

                            WHERE id = $1
                            `,

                            [friendId]
                        );


                    if (
                        result.rows.length === 0
                    ) {

                        socket.emit(
                            "errorMessage",

                            "Гравця не знайдено!"
                        );

                        return;

                    }


                    const player =
                        await getPlayer(
                            playerId
                        );


                    if (
                        player.friends
                        .includes(friendId)
                    ) {

                        socket.emit(
                            "errorMessage",

                            "Цей гравець вже у друзях!"
                        );

                        return;

                    }


                    player.friends.push(
                        friendId
                    );


                    await savePlayer(
                        player
                    );


                    socket.emit(
                        "playerData",
                        player
                    );


                    socket.emit(
                        "successMessage",

                        "Друга додано!"
                    );

                }

                catch (error) {

                    console.error(error);

                }

            }
        );


        /* =========================
           FRIENDS LIST
        ========================= */

        socket.on(
            "getFriends",

            async () => {

                try {

                    if (!playerId) return;


                    const player =
                        await getPlayer(
                            playerId
                        );


                    if (
                        player.friends.length === 0
                    ) {

                        socket.emit(
                            "friendsList",
                            []
                        );

                        return;

                    }


                    const result =
                        await pool.query(
                            `
                            SELECT

                                id,
                                nickname,
                                nickname_color,
                                trophies

                            FROM players

                            WHERE id = ANY($1::text[])
                            `,

                            [
                                player.friends
                            ]
                        );


                    const friends =
                        result.rows.map(
                            friend => ({

                                id:
                                    friend.id,

                                nickname:
                                    friend.nickname,

                                nicknameColor:
                                    friend.nickname_color,

                                trophies:
                                    Number(
                                        friend.trophies
                                    )

                            })
                        );


                    socket.emit(
                        "friendsList",
                        friends
                    );

                }

                catch (error) {

                    console.error(error);

                }

            }
        );


        /* =========================
           CREATE CLAN
        ========================= */

        socket.on(
            "createClan",

            async name => {

                try {

                    if (!playerId) return;


                    const player =
                        await getPlayer(
                            playerId
                        );


                    name =
                        String(
                            name || ""
                        )
                        .trim()
                        .slice(0, 25);


                    if (
                        player.clanId
                    ) {

                        socket.emit(
                            "errorMessage",

                            "Ти вже знаходишся в клані!"
                        );

                        return;

                    }


                    if (
                        player.coins < 5000
                    ) {

                        socket.emit(
                            "errorMessage",

                            "Для створення потрібно 5000 🪙!"
                        );

                        return;

                    }


                    if (
                        name.length < 3
                    ) {

                        socket.emit(
                            "errorMessage",

                            "Назва має бути мінімум 3 символи!"
                        );

                        return;

                    }


                    const clanId =
                        "clan_" +
                        Date.now() +
                        "_" +
                        Math.floor(
                            Math.random() *
                            100000
                        );


                    player.coins -=
                        5000;


                    player.spentCoins +=
                        5000;


                    player.clanId =
                        clanId;


                    await savePlayer(
                        player
                    );


                    await pool.query(
                        `
                        INSERT INTO clans (

                            id,
                            name,
                            owner,
                            members,
                            trophies,
                            created_at

                        )

                        VALUES (

                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6

                        )
                        `,

                        [

                            clanId,

                            name,

                            playerId,

                            JSON.stringify(
                                [playerId]
                            ),

                            0,

                            Date.now()

                        ]
                    );


                    socket.join(
                        clanId
                    );


                    socket.emit(
                        "clanCreated",

                        {
                            id:
                                clanId,

                            name
                        }
                    );


                    socket.emit(
                        "playerData",
                        player
                    );


                    await sendTopClans();

                }

                catch (error) {

                    console.error(error);

                }

            }
        );


        /* =========================
           JOIN CLAN ROOM
        ========================= */

        socket.on(
            "joinClanRoom",

            async () => {

                try {

                    if (!playerId) return;


                    const player =
                        await getPlayer(
                            playerId
                        );


                    if (
                        player.clanId
                    ) {

                        socket.join(
                            player.clanId
                        );

                    }

                }

                catch (error) {

                    console.error(error);

                }

            }
        );


        /* =========================
           CLAN CHAT
        ========================= */

        socket.on(
            "clanMessage",

            async text => {

                try {

                    if (!playerId) return;


                    const player =
                        await getPlayer(
                            playerId
                        );


                    if (
                        !player.clanId
                    ) return;


                    text =
                        String(
                            text || ""
                        )
                        .trim()
                        .slice(0, 300);


                    if (!text) return;


                    io.to(
                        player.clanId
                    )
                    .emit(
                        "clanMessage",

                        {

                            nickname:
                                player.nickname,

                            color:
                                player.nicknameColor,

                            text

                        }
                    );

                }

                catch (error) {

                    console.error(error);

                }

            }
        );


        /* =========================
           GET TOP CLANS
        ========================= */

        socket.on(
            "getTopClans",

            async () => {

                await sendTopClans();

            }
        );


        /* =========================
           PVP SEARCH
        ========================= */

        socket.on(
            "findPvp",

            async () => {

                if (!playerId) return;


                removeFromQueue(
                    playerId
                );


                let opponent = null;


                while (
                    waitingPlayers.length > 0
                ) {

                    const possibleOpponent =
                        waitingPlayers.shift();


                    if (
                        possibleOpponent.playerId !==
                        playerId
                    ) {

                        const opponentSocket =
                            io.sockets.sockets.get(
                                possibleOpponent.socketId
                            );


                        if (opponentSocket) {

                            opponent =
                                possibleOpponent;

                            break;

                        }

                    }

                }


                if (!opponent) {

                    waitingPlayers.push(
                        {

                            playerId,

                            socketId:
                                socket.id

                        }
                    );


                    socket.emit(
                        "pvpWaiting"
                    );

                    return;

                }


                const opponentSocket =
                    io.sockets.sockets.get(
                        opponent.socketId
                    );


                if (!opponentSocket) {

                    return;

                }


                const roomId =
                    "pvp_" +
                    Date.now() +
                    "_" +
                    Math.floor(
                        Math.random() *
                        100000
                    );


                socket.join(
                    roomId
                );


                opponentSocket.join(
                    roomId
                );


                const match =
                    {

                        roomId,

                        players:

                            {

                                [playerId]:
                                    0,

                                [opponent.playerId]:
                                    0

                            },

                        active:
                            true

                    };


                pvpMatches.set(
                    roomId,
                    match
                );


                io.to(roomId)
                .emit(
                    "pvpStart",

                    {

                        roomId,

                        duration:
                            120

                    }
                );


                setTimeout(

                    async () => {

                        await finishPvp(
                            roomId
                        );

                    },

                    120000

                );

            }
        );


        /* =========================
           PVP CLICK
        ========================= */

        socket.on(
            "pvpClick",

            roomId => {

                if (!playerId) return;


                const match =
                    pvpMatches.get(
                        roomId
                    );


                if (
                    !match ||
                    !match.active
                ) return;


                if (
                    match.players[playerId] ===
                    undefined
                ) return;


                match.players[playerId] +=
                    0.1;


                io.to(roomId)
                .emit(
                    "pvpUpdate",

                    match.players
                );

            }
        );


        /* =========================
           RESET PROGRESS
        ========================= */

        socket.on(
            "resetProgress",

            async () => {

                try {

                    if (!playerId) return;


                    const oldPlayer =
                        await getPlayer(
                            playerId
                        );


                    const newPlayer =
                        createPlayer(
                            playerId
                        );


                    /*
                    Якщо був у клані,
                    видаляємо з учасників
                    */

                    if (
                        oldPlayer.clanId
                    ) {

                        const clanResult =
                            await pool.query(
                                `
                                SELECT *
                                FROM clans
                                WHERE id = $1
                                `,

                                [
                                    oldPlayer.clanId
                                ]
                            );


                        if (
                            clanResult.rows.length > 0
                        ) {

                            let members =
                                clanResult.rows[0]
                                .members;


                            members =
                                members.filter(
                                    id =>
                                        id !==
                                        playerId
                                );


                            await pool.query(
                                `
                                UPDATE clans

                                SET members = $1

                                WHERE id = $2
                                `,

                                [

                                    JSON.stringify(
                                        members
                                    ),

                                    oldPlayer.clanId

                                ]
                            );

                        }

                    }


                    await savePlayer(
                        newPlayer
                    );


                    socket.emit(
                        "playerData",
                        newPlayer
                    );


                    socket.emit(
                        "successMessage",

                        "Прогрес скинуто!"
                    );


                    await sendTopPlayers();

                }

                catch (error) {

                    console.error(error);

                }

            }
        );
                      

        /* =========================
           DISCONNECT
        ========================= */

        socket.on(
            "disconnect",

            () => {

                if (playerId) {

                    removeFromQueue(
                        playerId
                    );

                }


                console.log(
                    "Гравець відключився:",
                    socket.id
                );

            }
        );

    }
);


/* =========================
   SERVER START
========================= */

setupDatabase()
    .then(async () => {

        console.log(
            "База даних підключена!"
        );

        const PORT =
            process.env.PORT || 3000;

        server.listen(
            PORT,
            "0.0.0.0",
            () => {

                console.log(
                    `ChickenClick server running on port ${PORT}`
                );

            }
        );

    })
    .catch(error => {

        console.error(
            "КРИТИЧНА ПОМИЛКА БАЗИ:",
            error
        );

        process.exit(1);

    });
