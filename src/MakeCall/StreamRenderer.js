import React from "react";
import { utils } from "../Utils/Utils";
import { VideoStreamRenderer } from "@azure/communication-calling";
import { TooltipHost } from "office-ui-fabric-react";
export default class StreamRenderer extends React.Component {
  constructor(props) {
    super(props);
    this.stream = props.stream;
    this.remoteParticipant = props.remoteParticipant;
    this.componentId = `${utils.getIdentifierText(
      this.remoteParticipant.identifier
    )}-${this.stream.mediaStreamType}-${this.stream.id}`;
    this.videoContainerId = this.componentId + "-videoContainer";
    this.renderer = undefined;
    this.view = undefined;
    this.dominantSpeakerMode = props.dominantSpeakerMode;
    this.dominantRemoteParticipant = props.dominantRemoteParticipant;
    this.state = {
      isSpeaking: false,
      displayName: this.remoteParticipant.displayName?.trim(),
    };
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.dominantSpeakerMode !== prevProps.dominantSpeakerMode) {
      this.dominantSpeakerMode = prevProps.dominantSpeakerMode;
    }

    if (
      this.dominantRemoteParticipant !== prevProps.dominantRemoteParticipant
    ) {
      this.dominantRemoteParticipant = prevProps.dominantRemoteParticipant;
    }
  }

  /**
   * Start stream after DOM has rendered
   */
  async componentDidMount() {
    document.getElementById(this.componentId).hidden = true;

    this.remoteParticipant.on("isSpeakingChanged", () => {
      this.setState({ isSpeaking: this.remoteParticipant.isSpeaking });
    });

    this.remoteParticipant.on("isMutedChanged", () => {
      if (this.remoteParticipant.isMuted) {
        this.setState({ isSpeaking: false });
      }
    });
    this.remoteParticipant.on("displayNameChanged", () => {
      this.setState({
        displayName: this.remoteParticipant.displayName?.trim(),
      });
    });

    this.stream.on("isAvailableChanged", async () => {
      try {
        if (
          this.dominantSpeakerMode &&
          this.dominantRemoteParticipant !== this.remoteParticipant
        ) {
          return;
        }

        if (this.stream.isAvailable && !this.renderer) {
          await this.createRenderer();
          this.attachRenderer();
        } else {
          this.disposeRenderer();
        }
      } catch (e) {
        console.error(e);
      }
    });

    if (
      this.dominantSpeakerMode &&
      this.dominantRemoteParticipant !== this.remoteParticipant
    ) {
      return;
    }

    try {
      if (this.stream.isAvailable && !this.renderer) {
        await this.createRenderer();
        this.attachRenderer();
      }
    } catch (e) {
      console.error(e);
    }
  }

  getRenderer() {
    return this.renderer;
  }

  async createRenderer() {
    // debugger;
    if (!this.renderer) {
      this.renderer = new VideoStreamRenderer(this.stream);
      console.log("render ---------- ", this.render);
      this.view = await this.renderer.createView();
      console.log("render viewws ---------- ", this.view);
    } else {
      throw new Error(
        `[App][StreamMedia][id=${this.stream.id}][createRenderer] stream already has a renderer`
      );
    }
  }

  async attachRenderer() {
    try {
      if (!this.view.target) {
        throw new Error(
          `[App][StreamMedia][id=${this.stream.id}][attachRenderer] target is undefined. Must create renderer first`
        );
      }
      document.getElementById(this.componentId).hidden = false;
      document
        .getElementById(this.videoContainerId)
        .appendChild(this.view.target);
    } catch (e) {
      console.error(e);
    }
  }

  disposeRenderer() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = undefined;
      document.getElementById(this.componentId).hidden = true;
    } else {
    }
  }

  render() {
    return (
      <div
        id={this.componentId}
        className={`grid grid-cols-1`}
        style={{ width: "100%", height: "100%", overflow: "hidden" }}
      >
        <div
          className={`${
            this.state.isSpeaking ? `speaking-border-for-video` : ``
          }`}
          style={{ width: "100%", height: "100%", overflow: "hidden" }}
          // style={{width:'51rem'}}
          id={this.videoContainerId}
        >
          <h4 className="absolute bottom-5 text-white text-sm w-20">
            {this.state.displayName
              ? this.state.displayName
              : utils.getIdentifierText(this.remoteParticipant.identifier)}
          </h4>
        </div>
      </div>
    );
  }
}
