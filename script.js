const socket = io();

let player = null;
let currentPvpRoom = null;
let pvpInterval = null;

let playerId = localStorage.getItem("chickenPlayerId");

if (!playerId) {
    playerId = crypto.randomUUID();

    localStorage.setItem(
        "chickenPlayerId",
        playerId
    );
}


/* =========================
   SKINS
========================= */

const skins = [];

for (let i = 1; i <= 50; i++) {
    skins.push({
        id: i,
        name: "🔫 Скін #" + i,
        price: i * 100
    });
}


/* =========================
   LOGIN
========================= */

socket.emit("login", playerId);


socket.on("playerData", data => {

    player = data;

    renderPlayer();

});


/* =========================
   MESSAGES
========================= */

socket.on("errorMessage", message => {
    showToast("❌ " + message);
});


socket.on("successMessage", message => {
    showToast("✅ " + message);
});


/* =========================
   LOADING
========================= */

window.addEventListener("load", () => {

    setTimeout(() => {

        const loading =
            document.getElementById(
                "loadingScreen"
            );

        const game =
            document.getElementById(
                "game"
            );

        if (loading) {
            loading.classList.add("hidden");
        }

        if (game) {
            game.classList.remove("hidden");
        }

    }, 1000);

});


/* =========================
   NAVIGATION
========================= */

document
    .querySelectorAll(".nav-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const page =
                    button.dataset.page;

                openPage(page);

            }
        );

    });


function openPage(id) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove(
                "active"
            );

        });


    const page =
        document.getElementById(id);


    if (page) {
        page.classList.add("active");
    }


    document
        .querySelectorAll(".nav-button")
        .forEach(button => {

            button.classList.remove(
                "active"
            );

            if (
                button.dataset.page === id
            ) {

                button.classList.add(
                    "active"
                );

            }

        });


    if (id === "topPage") {
        socket.emit("getTopClans");
    }


    if (id === "friendsPage") {
        socket.emit("getFriends");
    }


    if (id === "clansPage") {

        if (
            player &&
            player.clanId
        ) {

            socket.emit(
                "joinClanRoom"
            );

            loadMyClan();

        }

    }


    if (id === "clanChatPage") {

        socket.emit(
            "joinClanRoom"
        );

    }

}


/* =========================
   PROFILE BUTTON
========================= */

document
    .getElementById("profileButton")
    .addEventListener(
        "click",
        () => {

            openPage("profilePage");

        }
    );


/* =========================
   RENDER PLAYER
========================= */

function renderPlayer() {

    if (!player) return;


    /* COINS */

    document
        .getElementById("coins")
        .textContent =
        Number(player.coins)
            .toFixed(1);


    /* TROPHIES */

    document
        .getElementById("trophies")
        .textContent =
        player.trophies;


    /* CLICKS */

    document
        .getElementById("clicks")
        .textContent =
        player.clicks;


    /* MINI NICK */

    const miniNickname =
        document.getElementById(
            "miniNickname"
        );

    miniNickname.textContent =
        player.nickname;

    miniNickname.style.color =
        player.nicknameColor;


    /* ID */

    document
        .getElementById("playerId")
        .textContent =
        "ID: " + player.id;


    /* PROFILE */

    document
        .getElementById("profileNickname")
        .textContent =
        player.nickname;

    document
        .getElementById("profileNickname")
        .style.color =
        player.nicknameColor;


    document
        .getElementById("profileId")
        .textContent =
        player.id;


    /* STATS */

    document
        .getElementById("statClicks")
        .textContent =
        player.clicks;


    document
        .getElementById("statEarned")
        .textContent =
        Number(
            player.earnedCoins
        ).toFixed(1);


    document
        .getElementById("statSpent")
        .textContent =
        Number(
            player.spentCoins
        ).toFixed(1);


    document
        .getElementById("statTrophies")
        .textContent =
        player.trophies;


    /* DAILY */

    document
        .getElementById("dailyDay")
        .textContent =
        player.dailyDay;


    document
        .getElementById("dailyReward")
        .textContent =
        "+" +
        (
            player.dailyDay * 10
        ) +
        " 🪙";


    renderShop();

    renderInventory();

    loadMyClan();

}


/* =========================
   CHICKEN CLICK
========================= */

document
    .getElementById(
        "chickenButton"
    )
    .addEventListener(
        "click",
        event => {

            socket.emit(
                "clickChicken"
            );


            createClickEffect(
                event
            );

        }
    );


function createClickEffect(event) {

    const container =
        document.getElementById(
            "clickEffectContainer"
        );


    const effect =
        document.createElement(
            "span"
        );


    effect.textContent =
        "+0.1 🪙";


    effect.className =
        "click-effect";


    effect.style.left =
        event.offsetX + "px";


    effect.style.top =
        event.offsetY + "px";


    container.appendChild(
        effect
    );


    setTimeout(() => {

        effect.remove();

    }, 700);

}


/* =========================
   NICKNAME
========================= */

document
    .getElementById(
        "saveNicknameButton"
    )
    .addEventListener(
        "click",
        () => {

            const nickname =
                document
                    .getElementById(
                        "nicknameInput"
                    )
                    .value
                    .trim();


            const color =
                document
                    .getElementById(
                        "nicknameColorInput"
                    )
                    .value;


            socket.emit(
                "changeNickname",
                {
                    nickname,
                    color
                }
            );

        }
    );


/* =========================
   PROMO
========================= */

document
    .getElementById(
        "usePromoButton"
    )
    .addEventListener(
        "click",
        () => {

            const input =
                document.getElementById(
                    "promoInput"
                );


            const code =
                input.value.trim();


            if (!code) return;


            socket.emit(
                "usePromo",
                code
            );


            input.value = "";

        }
    );


/* =========================
   DAILY
========================= */

document
    .getElementById(
        "claimDailyButton"
    )
    .addEventListener(
        "click",
        () => {

            socket.emit(
                "claimDaily"
            );

        }
    );


/* =========================
   FRIENDS
========================= */

document
    .getElementById(
        "addFriendButton"
    )
    .addEventListener(
        "click",
        () => {

            const input =
                document.getElementById(
                    "friendIdInput"
                );


            const id =
                input.value.trim();


            if (!id) return;


            socket.emit(
                "addFriend",
                id
            );


            input.value = "";

        }
    );


socket.on(
    "friendsList",
    friends => {

        const container =
            document.getElementById(
                "friendsList"
            );


        container.innerHTML = "";


        if (!friends.length) {

            container.innerHTML =
                `
                <div class="empty">
                    👥 Друзів поки немає
                </div>
                `;

            return;

        }


        friends.forEach(
            friend => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "friend-item";


                item.innerHTML = `
                    <b style="
                        color:${friend.nicknameColor}
                    ">
                        ${escapeHTML(
                            friend.nickname
                        )}
                    </b>

                    <br>

                    🏆 ${friend.trophies}

                    <br>

                    <small>
                        ID: ${escapeHTML(
                            friend.id
                        )}
                    </small>
                `;


                container.appendChild(
                    item
                );

            }
        );

    }
);


/* =========================
   CLANS
========================= */

document
    .getElementById(
        "createClanButton"
    )
    .addEventListener(
        "click",
        () => {

            const input =
                document.getElementById(
                    "clanNameInput"
                );


            const name =
                input.value.trim();


            if (!name) return;


            socket.emit(
                "createClan",
                name
            );

        }
    );


socket.on(
    "clanCreated",
    clan => {

        showToast(
            "🛡️ Клан створено!"
        );


        loadMyClan();


        openPage(
            "clansPage"
        );

    }
);


function loadMyClan() {

    if (!player) return;


    const clanBox =
        document.getElementById(
            "myClan"
        );


    const createBox =
        document.getElementById(
            "clanCreateBox"
        );


    if (!player.clanId) {

        clanBox.classList.add(
            "hidden"
        );

        createBox.classList.remove(
            "hidden"
        );

        return;

    }


    createBox.classList.add(
        "hidden"
    );


    clanBox.classList.remove(
        "hidden"
    );


    socket.emit(
        "joinClanRoom"
    );

}


/* =========================
   CLAN CHAT
========================= */

document
    .getElementById(
        "joinClanChatButton"
    )
    .addEventListener(
        "click",
        () => {

            if (
                !player ||
                !player.clanId
            ) {

                showToast(
                    "❌ Ти не в клані"
                );

                return;

            }


            socket.emit(
                "joinClanRoom"
            );


            openPage(
                "clanChatPage"
            );

        }
    );


document
    .getElementById(
        "sendClanMessageButton"
    )
    .addEventListener(
        "click",
        sendClanMessage
    );


document
    .getElementById(
        "clanMessageInput"
    )
    .addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                sendClanMessage();

            }

        }
    );


function sendClanMessage() {

    const input =
        document.getElementById(
            "clanMessageInput"
        );


    const text =
        input.value.trim();


    if (!text) return;


    socket.emit(
        "clanMessage",
        text
    );


    input.value = "";

}


socket.on(
    "clanMessage",
    message => {

        const container =
            document.getElementById(
                "clanMessages"
            );


        const item =
            document.createElement(
                "div"
            );


        item.className =
            "message";


        item.innerHTML = `
            <b style="
                color:${message.color}
            ">
                ${escapeHTML(
                    message.nickname
                )}
            </b>
            :
            ${escapeHTML(
                message.text
            )}
        `;


        container.appendChild(
            item
        );


        container.scrollTop =
            container.scrollHeight;

    }
);


/* =========================
   TOP PLAYERS
========================= */

socket.on(
    "topPlayers",
    players => {

        const container =
            document.getElementById(
                "topPlayers"
            );


        container.innerHTML = "";


        players.forEach(
            (p, index) => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "top-item";


                item.innerHTML = `
                    <span>
                        #${index + 1}

                        <b style="
                            color:${p.nicknameColor}
                        ">
                            ${escapeHTML(
                                p.nickname
                            )}
                        </b>
                    </span>

                    <span>
                        🏆 ${p.trophies}
                    </span>
                `;


                container.appendChild(
                    item
                );

            }
        );

    }
);


/* =========================
   TOP CLANS
========================= */

socket.on(
    "topClans",
    clans => {

        const container =
            document.getElementById(
                "topClans"
            );


        container.innerHTML = "";


        if (!clans.length) {

            container.innerHTML =
                `
                <div class="empty">
                    🛡️ Кланів поки немає
                </div>
                `;

            return;

        }


        clans.forEach(
            (clan, index) => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "top-item";


                item.innerHTML = `
                    <span>
                        #${index + 1}
                        🛡️
                        ${escapeHTML(
                            clan.name
                        )}
                    </span>

                    <span>
                        🏆 ${clan.trophies}
                    </span>
                `;


                container.appendChild(
                    item
                );

            }
        );

    }
);


/* =========================
   PVP
========================= */

document
    .getElementById(
        "findPvpButton"
    )
    .addEventListener(
        "click",
        () => {

            socket.emit(
                "findPvp"
            );

        }
    );


socket.on(
    "pvpWaiting",
    () => {

        showToast(
            "🔎 Шукаємо суперника..."
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
                "pvpLobby"
            )
            .classList.add(
                "hidden"
            );


        document
            .getElementById(
                "pvpGame"
            )
            .classList.remove(
                "hidden"
            );


        document
            .getElementById(
                "myPvpScore"
            )
            .textContent =
            "0";


        document
            .getElementById(
                "enemyPvpScore"
            )
            .textContent =
            "0";


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

        const myScore =
            scores[playerId] || 0;


        let enemyScore = 0;


        Object.keys(scores)
            .forEach(id => {

                if (
                    id !== playerId
                ) {

                    enemyScore =
                        scores[id];

                }

            });


        document
            .getElementById(
                "myPvpScore"
            )
            .textContent =
            Number(
                myScore
            ).toFixed(1);


        document
            .getElementById(
                "enemyPvpScore"
            )
            .textContent =
            Number(
                enemyScore
            ).toFixed(1);

    }
);


function startPvpTimer(time) {

    clearInterval(
        pvpInterval
    );


    const timer =
        document.getElementById(
            "pvpTimer"
        );


    timer.textContent =
        time;


    pvpInterval =
        setInterval(
            () => {

                time--;

                timer.textContent =
                    time;


                if (time <= 0) {

                    clearInterval(
                        pvpInterval
                    );

                }

            },
            1000
        );

}


socket.on(
    "pvpEnd",
    data => {

        clearInterval(
            pvpInterval
        );


        currentPvpRoom =
            null;


        document
            .getElementById(
                "pvpGame"
            )
            .classList.add(
                "hidden"
            );


        document
            .getElementById(
                "pvpLobby"
            )
            .classList.remove(
                "hidden"
            );


        if (!data.winner) {

            showToast(
                "🤝 Нічия!"
            );

            return;

        }


        if (
            data.winner === playerId
        ) {

            showToast(
                "🎉 ТИ ПЕРЕМІГ! +5 🏆"
            );

        } else {

            showToast(
                "😢 Ти програв!"
            );

        }

    }
);


/* =========================
   SHOP
========================= */

function renderShop() {

    if (!player) return;


    const container =
        document.getElementById(
            "shopItems"
        );


    container.innerHTML = "";


    skins.forEach(
        skin => {

            const owned =
                player.inventory
                    .includes(
                        skin.id
                    );


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "shop-item";


            item.innerHTML = `

                <div class="skin-icon">
                    🔫
                </div>

                <h3>
                    ${skin.name}
                </h3>

                <p>
                    🪙 ${skin.price}
                </p>

                <button
                    class="buy-skin"
                    data-id="${skin.id}"
                    ${owned ? "disabled" : ""}
                >
                    ${
                        owned
                            ? "В інвентарі"
                            : "Купити"
                    }
                </button>

            `;


            container.appendChild(
                item
            );

        }
    );


    document
        .querySelectorAll(
            ".buy-skin"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        showToast(
                            "🛒 Система покупки скінів буде підключена сервером."
                        );

                    }
                );

            }
        );

}


/* =========================
   INVENTORY
========================= */

function renderInventory() {

    if (!player) return;


    const container =
        document.getElementById(
            "inventoryItems"
        );


    container.innerHTML = "";


    if (
        !player.inventory ||
        player.inventory.length === 0
    ) {

        container.innerHTML =
            `
            <div class="empty">
                🎒 Інвентар порожній
            </div>
            `;

        return;

    }


    player.inventory.forEach(
        id => {

            const skin =
                skins.find(
                    s =>
                    s.id === id
                );


            if (!skin) return;


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "shop-item";


            item.innerHTML = `
                <div class="skin-icon">
                    🔫
                </div>

                <h3>
                    ${skin.name}
                </h3>

                <p>
                    ✅ Отримано
                </p>
            `;


            container.appendChild(
                item
            );

        }
    );

}


/* =========================
   RESET
========================= */

document
    .getElementById(
        "resetProgressButton"
    )
    .addEventListener(
        "click",
        () => {

            const confirmed =
                confirm(
                    "⚠️ Точно скинути весь прогрес?"
                );


            if (!confirmed) return;


            socket.emit(
                "resetProgress"
            );

        }
    );


/* =========================
   TOAST
========================= */

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        2500
    );

}


/* =========================
   HTML SECURITY
========================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
