const socket = io();

let player = null;

let playerId =
    localStorage.getItem(
        "chickenPlayerId"
    );


if (!playerId) {

    playerId =
        crypto.randomUUID();

    localStorage.setItem(
        "chickenPlayerId",
        playerId
    );
}


let currentPvpRoom = null;


const skins = [];


for (let i = 1; i <= 50; i++) {

    skins.push({

        id: i,

        name:
            "🔫 Скін #" + i,

        price:
            i * 100

    });

}


/* LOGIN */

socket.emit(
    "login",
    playerId
);


socket.on(
    "playerData",
    data => {

        player = data;

        renderPlayer();

    }
);


socket.on(
    "errorMessage",
    message => {

        alert(message);

    }
);


socket.on(
    "successMessage",
    message => {

        alert(message);

    }
);


/* START */

setTimeout(() => {

    document
        .getElementById("loading")
        .style.display = "none";


    document
        .getElementById("game")
        .style.display = "block";

}, 1000);


/* PAGES */

window.openPage =
function(id) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove(
                "active"
            );

        });


    document
        .getElementById(id)
        .classList.add(
            "active"
        );


    if (id === "topPage") {

        socket.emit(
            "getTopClans"
        );

    }


    if (id === "friendsPage") {

        loadFriends();

    }


    if (
        id === "clansPage" &&
        player &&
        player.clanId
    ) {

        socket.emit(
            "joinClanRoom"
        );

        showClanChat();

    }

};


/* RENDER */

function renderPlayer() {

    if (!player) return;


    document
        .getElementById("coins")
        .textContent =
        Number(player.coins)
        .toFixed(1);


    document
        .getElementById("trophies")
        .textContent =
        player.trophies;


    document
        .getElementById("clicks")
        .textContent =
        player.clicks;


    document
        .getElementById("playerNickname")
        .textContent =
        player.nickname;


    document
        .getElementById("playerNickname")
        .style.color =
        player.nicknameColor;


    document
        .getElementById("profileName")
        .textContent =
        player.nickname;


    document
        .getElementById("profileName")
        .style.color =
        player.nicknameColor;


    document
        .getElementById("playerId")
        .textContent =
        playerId;


    document
        .getElementById("profileClicks")
        .textContent =
        player.clicks;


    document
        .getElementById("earnedCoins")
        .textContent =
        Number(player.earnedCoins)
        .toFixed(1);


    document
        .getElementById("spentCoins")
        .textContent =
        Number(player.spentCoins)
        .toFixed(1);


    document
        .getElementById("profileTrophies")
        .textContent =
        player.trophies;


    document
        .getElementById("dailyDay")
        .textContent =
        player.dailyDay;


    document
        .getElementById("dailyReward")
        .textContent =
        player.dailyDay * 10;


    renderShop();

    renderInventory();

}


/* CLICK */

document
    .getElementById("chicken")
    .addEventListener(
        "click",
        () => {

            socket.emit(
                "clickChicken"
            );

        }
    );


/* NICKNAME */

window.changeNickname =
function() {

    const nickname =
        document
            .getElementById(
                "nicknameInput"
            )
            .value;


    const color =
        document
            .getElementById(
                "nicknameColor"
            )
            .value;


    socket.emit(
        "changeNickname",
        {
            nickname,
            color
        }
    );

};


/* PROMO */

window.usePromo =
function() {

    const code =
        document
            .getElementById(
                "promoInput"
            )
            .value;


    socket.emit(
        "usePromo",
        code
    );

};


/* DAILY */

window.claimDaily =
function() {

    socket.emit(
        "claimDaily"
    );

};


/* FRIENDS */

window.addFriend =
function() {

    const id =
        document
            .getElementById(
                "friendId"
            )
            .value;


    socket.emit(
        "addFriend",
        id
    );

};


window.loadFriends =
function() {

    socket.emit(
        "getFriends"
    );

};


socket.on(
    "friendsList",
    friends => {

        const container =
            document
                .getElementById(
                    "friendsList"
                );


        container.innerHTML = "";


        friends.forEach(friend => {

            container.innerHTML += `

                <div class="friendItem">

                    <b
                    style="
                    color:${friend.nicknameColor}
                    ">

                        ${friend.nickname}

                    </b>

                    <br>

                    🏆
                    ${friend.trophies}

                    <br>

                    <small>

                        ID:
                        ${friend.id}

                    </small>

                </div>

            `;

        });

    }
);


/* CLANS */

window.createClan =
function() {

    const name =
        document
            .getElementById(
                "clanName"
            )
            .value;


    socket.emit(
        "createClan",
        name
    );

};


socket.on(
    "clanCreated",
    clan => {

        document
            .getElementById(
                "clanInfo"
            )
            .innerHTML = `

                <h3>
                    🛡️ ${clan.name}
                </h3>

            `;


        showClanChat();

    }
);


function showClanChat() {

    document
        .getElementById(
            "clanChat"
        )
        .classList.remove(
            "hidden"
        );

}


window.sendClanMessage =
function() {

    const input =
        document
            .getElementById(
                "messageInput"
            );


    const text =
        input.value;


    if (!text.trim()) return;


    socket.emit(
        "clanMessage",
        text
    );


    input.value = "";

};


socket.on(
    "clanMessage",
    message => {

        const messages =
            document
                .getElementById(
                    "messages"
                );


        messages.innerHTML += `

            <div class="message">

                <b
                style="
                color:${message.color}
                ">

                    ${message.nickname}

                </b>

                :

                ${message.text}

            </div>

        `;


        messages.scrollTop =
            messages.scrollHeight;

    }
);


/* TOP */

socket.on(
    "topPlayers",
    players => {

        const container =
            document
                .getElementById(
                    "topPlayers"
                );


        container.innerHTML = "";


        players.forEach(
            (p, index) => {

                container.innerHTML += `

                    <div class="topItem">

                        <span>

                            #${index + 1}

                            <b
                            style="
                            color:${p.nicknameColor}
                            ">

                                ${p.nickname}

                            </b>

                        </span>


                        <span>

                            🏆
                            ${p.trophies}

                        </span>

                    </div>

                `;

            }
        );

    }
);


socket.on(
    "topClans",
    clans => {

        const container =
            document
                .getElementById(
                    "topClans"
                );


        container.innerHTML = "";


        clans.forEach(
            (clan, index) => {

                container.innerHTML += `

                    <div class="topItem">

                        <span>

                            #${index + 1}

                            🛡️
                            ${clan.name}

                        </span>


                        <span>

                            🏆
                            ${clan.trophies}

                        </span>

                    </div>

                `;

            }
        );

    }
);


/* PvP */

window.findPvp =
function() {

    socket.emit(
        "findPvp"
    );

};


socket.on(
    "pvpWaiting",
    () => {

        alert(
            "🔎 Пошук суперника..."
        );

    }
);


socket.on(
    "pvpStart",
    data => {

        currentPvpRoom =
            data.roomId;


        document
            .getElementById(
                "pvpGame"
            )
            .classList.remove(
                "hidden"
            );


        startPvpTimer(
            data.duration
        );

    }
);


document
    .getElementById(
        "pvpClickButton"
    )
    .addEventListener(
        "click",
        () => {

            if (!currentPvpRoom) return;


            socket.emit(
                "pvpClick",
                currentPvpRoom
            );

        }
    );


socket.on(
    "pvpUpdate",
    scores => {

        const ids =
            Object.keys(scores);


        let myScore =
            scores[playerId] || 0;


        let enemyScore = 0;


        ids.forEach(id => {

            if (id !== playerId) {

                enemyScore =
                    scores[id];

            }

        });


        document
            .getElementById(
                "myPvpScore"
            )
            .textContent =
            myScore.toFixed(1);


        document
            .getElementById(
                "enemyPvpScore"
            )
            .textContent =
            enemyScore.toFixed(1);

    }
);


let pvpInterval;


function startPvpTimer(time) {

    clearInterval(
        pvpInterval
    );


    pvpInterval =
        setInterval(() => {

            time--;


            document
                .getElementById(
                    "pvpTimer"
                )
                .textContent =
                time;


            if (time <= 0) {

                clearInterval(
                    pvpInterval
                );

            }

        }, 1000);

}


socket.on(
    "pvpEnd",
    data => {

        clearInterval(
            pvpInterval
        );


        currentPvpRoom = null;


        document
            .getElementById(
                "pvpGame"
            )
            .classList.add(
                "hidden"
            );


        if (!data.winner) {

            alert(
                "🤝 Нічия!"
            );

            return;

        }


        if (
            data.winner === playerId
        ) {

            alert(
                "🎉 ТИ ПЕРЕМІГ!\n+5 🏆"
            );

        } else {

            alert(
                "😢 Ти програв!"
            );

        }

    }
);


/* SHOP */

function renderShop() {

    if (!player) return;


    const shop =
        document
            .getElementById(
                "shopItems"
            );


    shop.innerHTML = "";


    skins.forEach(skin => {

        const owned =
            player.inventory
            .includes(skin.id);


        shop.innerHTML += `

            <div class="shopItem">

                <h3>
                    ${skin.name}
                </h3>

                <p>
                    ${skin.price} 🪙
                </p>

                <button disabled>

                    ${
                        owned
                            ? "Куплено"
                            : "Поки що серверний магазин"
                    }

                </button>

            </div>

        `;

    });

}


function renderInventory() {

    if (!player) return;


    const inventory =
        document
            .getElementById(
                "inventory"
            );


    inventory.innerHTML = "";


    if (
        !player.inventory.length
    ) {

        inventory.innerHTML =
            "<p>🎒 Інвентар порожній</p>";

        return;

    }


    player.inventory.forEach(id => {

        const skin =
            skins.find(
                skin =>
                skin.id === id
            );


        inventory.innerHTML += `

            <div class="shopItem">

                ${skin.name}

            </div>

        `;

    });

}


/* RESET */

window.resetProgress =
function() {

    alert(
        "Скидання прогресу буде додано окремою серверною командою."
    );

};
