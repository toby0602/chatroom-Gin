package main

import (
	"encoding/json"
	"net/http"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"sync"
)

// Message 用於封裝 WebSocket 消息
type Message struct {
	Event   string `json:"event"`
	Name    string `json:"name"`
	Content string `json:"content"`
}

// NewMessage 創建新的 Message
func NewMessage(event, name, content string) *Message {
	return &Message{
		Event:   event,
		Name:    name,
		Content: content,
	}
}

// GetByteMessage 將 Message 轉換為字節切片
func (m *Message) GetByteMessage() []byte {
	result, _ := json.Marshal(m)
	return result
}

// 儲存連接的映射
var clients = make(map[*websocket.Conn]bool)
var clientsLock sync.Mutex

// WebSocket 升級配置
// var upgrader = websocket.Upgrader{
// 	CheckOrigin: func(r *http.Request) bool {
// 		return true // 允許跨域請求
// 	},
// }

// // 防止CSRF 攻擊
var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        allowedOrigins := map[string]bool{        // 用來儲存允許的原點域名。只要請求的 Origin 標頭與此列表中的域名匹配，就會允許升級為 WebSocket 連接。
            "http://localhost:5000": true,
            "https://sub.yourdomain.com": true,
        }

        origin := r.Header.Get("Origin")          // 從請求的標頭中獲取 Origin 值。Origin 標頭通常會包含發送請求的頁面所在的域名。
        return allowedOrigins[origin]
    },
}

// WebSocket 處理函數
func wsHandler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upgrade to WebSocket"})
		return
	}
	defer conn.Close()

	// 新連接加入
	clientsLock.Lock()
	clients[conn] = true
	clientsLock.Unlock()

	// 通知其他用戶新用戶加入
	id := c.Query("id")
	msg := NewMessage("other", id, "加入聊天室").GetByteMessage()
	broadcast(msg)

	// 處理消息
	for {
		_, message, err := conn.ReadMessage() // 不需要使用 messageType
		if err != nil {
			break
		}
		// 廣播消息給所有客戶端
		if err := broadcast(message); err != nil {
			break
		}
	}

	// 客戶端斷開連接
	clientsLock.Lock()
	delete(clients, conn)
	clientsLock.Unlock()
	msg = NewMessage("other", id, "離開聊天室").GetByteMessage()
	broadcast(msg)
}

// 廣播消息給所有客戶端
func broadcast(message []byte) error {
	clientsLock.Lock()
	defer clientsLock.Unlock()
	for client := range clients {
		if err := client.WriteMessage(websocket.TextMessage, message); err != nil {
			client.Close()
			delete(clients, client)
		}
	}
	return nil
}

func main() {
	r := gin.Default()
	r.LoadHTMLGlob("C:/Users/Administrator/Desktop/all_/ithome-real-chat/template/html/*")
	r.Static("/assets", "./template/assets")
	
	// 設置首頁路由
	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})

	// 設置 WebSocket 路由
	r.GET("/ws", wsHandler)
	
	// 運行伺服器
	r.Run(":5000")
}
