import React, { useEffect } from "react";
import MakeCall from "../../MakeCall/MakeCall";
import { utils } from "../../Utils/Utils";

function JoinCall() {
  // useEffect(async () => {
  //   const data = await utils.provisionNewUser();
  //   console.log(data);
  // }, []);

  return (
    <div className="w-full h-full flex justify-center items-center">
      <div className="flex flex-row">
        <div></div>
        <div>
          <div>
            <span className="text-lg">Join Group Call</span>
          </div>
          <div>
            <MakeCall />
          </div>
        </div>
      </div>
    </div>
  );
}

export default JoinCall;
