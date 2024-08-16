const LEFT = "left";
const RIGHT = "right";

const EVENT_MESSAGE = "message"
const EVENT_OTHER = "other"

const userPhotos = [
    "/assets/img/pic1.jpg",
    "/assets/img/pic2.jpg",
    "/assets/img/pic3.jpg",
    "/assets/img/pic4.jpg",
    "/assets/img/pic5.jpg",
    "/assets/img/pic6.jpg",
    "/assets/img/pic7.jpg",
    "/assets/img/pic8.jpg",
    "/assets/img/pic9.jpg",
    "/assets/img/pic10.jpg",
]
var PERSON_IMG = userPhotos[getRandomNum(0, userPhotos.length)]; 
var PERSON_NAME = "Guest" + Math.floor(Math.random() * 1000); 

var ws;
var chatroom = document.getElementsByClassName("msger-chat");
var text = document.getElementById("msg");
var send = document.getElementById("send");

send.onclick = function (e) {
    handleMessageEvent();
};

text.onkeydown = function (e) {
    if (e.keyCode === 13 && text.value !== "") {
        handleMessageEvent();
    }
};

function createWebSocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log('WebSocket is already open or connecting');
        return;
    }

    var url = "ws://" + window.location.host + "/ws?id=" + PERSON_NAME;
    ws = new WebSocket(url);

    ws.onopen = function() {
        console.log('WebSocket connection opened');
    };

    ws.onmessage = function(e) {
        var m = JSON.parse(e.data);
        var msg = "";
        switch (m.event) {
            case EVENT_MESSAGE:
                if (m.name == PERSON_NAME) {
                    msg = getMessage(m.name, m.photo, RIGHT, m.content);
                } else {
                    msg = getMessage(m.name, m.photo, LEFT, m.content);
                }
                break;
            case EVENT_OTHER:
                if (m.name != PERSON_NAME) {
                    msg = getEventMessage(m.name + " " + m.content);
                } else {
                    msg = getEventMessage("您已" + m.content);
                }
                break;
        }
        insertMsg(msg, chatroom[0]);
    };

    ws.onclose = function(event) {
        console.log('WebSocket connection closed:', event);
        // 自動重連邏輯
        setTimeout(createWebSocket, 3000); // 3秒後嘗試重新連接
    };

    ws.onerror = function(error) {
        console.log('WebSocket error:', error);
    };
}


function handleMessageEvent() {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            "event": "message",
            "photo": PERSON_IMG,
            "name": PERSON_NAME,
            "content": text.value,
        }));
        text.value = "";
    } else {
        console.log('WebSocket is not open. ReadyState:', ws.readyState);
    }
}

function getEventMessage(msg) {
    return `<div class="msg-left">${msg}</div>`;
}

function getMessage(name, img, side, text) {
    const d = new Date();
    var msg = `
    <div class="msg ${side}-msg">
        <img src="${img}" alt="" class="msg-img">

      <div class="msg-bubble">
        <div class="msg-info">
          <div class="msg-info-name">${name}</div>
          <div class="msg-info-time">${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}</div>
        </div>

        <div class="msg-text">${text}</div>
      </div>
    </div>
  `;
    return msg;
}

function insertMsg(msg, domObj) {
    domObj.insertAdjacentHTML("beforeend", msg);
    domObj.scrollTop += 500;
}

function getRandomNum(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 創建 WebSocket 連接
createWebSocket();
