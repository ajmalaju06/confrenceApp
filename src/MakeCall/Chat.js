import React, { useEffect, useState } from "react";
import moment from "moment";
import parse from "html-react-parser";
import "../css/acs.css";
import sendImg from "../images/send.svg";

export default (props) => {
  const [chatThreadClient, setChatThreadClient] = useState(null);
  const [allMessages, setAllMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [stateCounter, setStateCounter] = useState(0);
  const [stateMessage, setStateMessage] = useState("");

  useEffect(async () => {
    if (props.chatClient) {
      // open notifications channel
      await props.chatClient.startRealtimeNotifications();

      // subscribe to new message notifications
      props.chatClient.on("chatMessageReceived", (e) => {
        console.log("Notification chatMessageReceived! ", e);

        // check whether the notification is intended for the current thread
        if (getThreadID() != e.threadId) {
          return;
        }

        let sentBySelf = false;

        if (e.sender.communicationUserId != props.userID) {
          sentBySelf = false;
          props.setShowChatBadge(true);
        } else {
          sentBySelf = true;
        }

        let messages = allMessages;
        messages.push({
          message: parse(e.message),
          timestamp: e.createdOn,
          displayName: e.senderDisplayName,
          type: e.type,
          sentBySelf: sentBySelf,
        });
        setAllMessages(messages);
        setStateMessage(e.message);

        console.log("messages - ", messages);
        setStateCounter(stateCounter + 1);
      });

      try {
        const threadId = getThreadID();

        let ctc = await props.chatClient.getChatThreadClient(threadId);
        console.log("chat thread ctc - ", ctc);
        setChatThreadClient(ctc);
      } catch (e) {
        console.log("error while chat thread creation - ", e);
      }
    }
  }, [props.chatClient]);

  useEffect(() => {
    console.log("state counter - ", stateCounter, stateMessage);
  }, [stateCounter, stateMessage]);

  const getThreadID = () => {
    if (props.chatInfo && props.chatInfo.threadId) {
      return props.chatInfo.threadId;
    }
    return "";
    // return "19:meeting_ZWQ5YWNkZGEtMDc2OC00OGRkLTk5OGEtOGZkY2IzMjU3ZjJj@thread.v2";
  };

  const sendMessage = async () => {
    try {
      let m = message.trim();
      if (!m || m === "") return;
      let sendMessageRequest = { content: m };
      let sendMessageOptions = { senderDisplayName: props.displayName };
      let sendChatMessageResult = await chatThreadClient.sendMessage(
        sendMessageRequest,
        sendMessageOptions
      );
      console.log("send chat message result - ", sendChatMessageResult);
      let messageId = sendChatMessageResult.id;
      setMessage("");
      console.log(`Message sent!, message id:${messageId}`);
    } catch (e) {
      console.log("Error while sending message - ", e);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      console.log("enter press here! ");
      sendMessage();
    }
  };

  return (
    <div className="w-full flex flex-col md:py-3 h-full bg-black chat-container transition duration-500 border-l">
      <div className="flex flex-row items-center px-3 hidden md:block md:flex">
        <span className="text-white flex flex-1 text-left">Chat</span>
        <i
          class="fas fa-times text-white mt-1 cursor-pointer"
          onClick={() => props.isChatOpen(false)}
        ></i>
      </div>

      <div className="flex-1 flex flex-col-reverse chat-bubble-container my-3 px-3">
        <div className="p-1">
          {allMessages.map((m) => (
            <div
              className={`${
                m.sentBySelf ? "send-chat-container" : "recieve-chat-container"
              }`}
            >
              <div
                className={`flex ${m.sentBySelf ? "p-1" : "p-2"} justify-start`}
              >
                <span className="heading-txt-style">{m.displayName}</span>
                <span className="heading-time-txt-style">
                  &nbsp;{" - "}&nbsp;
                </span>
                <span className="heading-time-txt-style" dir="ltr">
                  {moment(m.timestamp).format("hh:mm a")}
                </span>
              </div>
              <div
                className={`flex py-1 pl-2 ${m.sentBySelf ? `pr-3` : `pr-2`}`}
              >
                <span className="text-left flex sub-txt-style">
                  {m.message}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex px-3 md:mb-14">
        <div className="flex-1 flex mr-1">
          <textarea
            autoComplete="off"
            className="chat-input-style"
            placeholder="Type a new message."
            name="msg"
            value={message}
            id="message-box"
            onChange={(e) => {
              console.log("mesage - ", e);
              setMessage(e.target.value);
            }}
            onKeyPress={handleKeyPress}
          />
        </div>

        <div className={`send-button-container `} onClick={sendMessage}>
          <img className={`send-img-style `} src={sendImg}></img>
        </div>
      </div>
    </div>
  );
};
