import logo from "./logo.svg";
import "./App.css";
import JoinCall from "./view/JoinCall/JoinCall";
import { useEffect } from "react";

function App() {
  useEffect(() => {
    fetch("/tokens/provisionUser", { method: "POST" })
      .then((e) => e.json())
      .then((e) => console.log(e));
  }, []);

  return (
    <div className="App h-screen">
      <JoinCall />
    </div>
  );
}

export default App;
