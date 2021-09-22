import React, { useState } from "react";
import {
  MessageBar,
  MessageBarType,
  DefaultButton,
} from "office-ui-fabric-react";
import { IIconProps } from "@fluentui/react";
import { Separator } from "@fluentui/react/lib/Separator";
import { Dropdown } from "office-ui-fabric-react/lib/Dropdown";
import { LocalVideoStream, Features } from "@azure/communication-calling";
import { Panel, PanelType } from "office-ui-fabric-react/lib/Panel";
import { Icon } from "@fluentui/react/lib/Icon";
import { VideoTile, FluentThemeProvider } from "@azure/communication-react";
import { VideoStreamRenderer } from "@azure/communication-calling";

import {
  CallEnd28Filled,
  Chat28Filled,
  MicOn28Filled,
  MicOff28Filled,
  ScreenShareStart48Regular,
  Settings28Filled,
  Video28Filled,
  VideoOff28Filled,
  Chat28Regular,
  People28Regular,
} from "@fluentui/react-icons";

import StreamRenderer from "./StreamRenderer";
import LocalVideoPreviewCard from "./LocalVideoPreviewCard";
import { utils } from "../Utils/acs";
import Chat from "./Chat";
import "../css/acs.css";

export default class CallCard extends React.Component {
  constructor(props) {
    super(props);
    this.callFinishConnectingResolve = undefined;
    this.call = props.call;
    this.deviceManager = props.deviceManager;
    this.setCallState = props.setCallState;
    this.setCallInstance = props.setCallInstance;
    this.setTotalParticipantCount = props.setTotalParticipantCount;
    this.chatClient = props.chatClient;
    this.token = props.token;
    this.userID = props.userID;
    this.teamsURL = props.teamsURL;
    this.chatInfo = props.chatInfo;
    this.displayName = props.displayName;
    this.sessionId = props.sessionId;
    this.isAvailableStream = undefined;
    this.selectedPos = undefined;
    console.log(props.displayName);
    const videoTileStyles = {
      root: { height: "200px", width: "300px", border: "1px solid #999" },
    };

    this.state = {
      callState: this.call.state,
      callId: this.call.id,
      remoteParticipants: this.call.remoteParticipants,
      allRemoteParticipantStreams: [],
      videoOn: !!this.call.localVideoStreams[0],
      micMuted: false,
      onHold:
        this.call.state === "LocalHold" || this.call.state === "RemoteHold",
      screenShareOn: this.call.isScreenShareOn,
      cameraDeviceOptions: props.cameraDeviceOptions
        ? props.cameraDeviceOptions
        : [],
      speakerDeviceOptions: props.speakerDeviceOptions
        ? props.speakerDeviceOptions
        : [],
      microphoneDeviceOptions: props.microphoneDeviceOptions
        ? props.microphoneDeviceOptions
        : [],
      selectedCameraDeviceId: props.selectedCameraDeviceId,
      selectedSpeakerDeviceId: this.deviceManager.selectedSpeaker?.id,
      selectedMicrophoneDeviceId: this.deviceManager.selectedMicrophone?.id,
      showSettings: false,
      showLocalVideo: false,
      showChat: false,
      showChatBadge: false,
      callMessage: undefined,
      dominantSpeakerMode: false,
      dominantRemoteParticipant: undefined,
    };
  }

  componentDidMount() {
    this.setState({ displayName: this.props.displayName });
    const callCleanup = () => {
      if (!this.call) return;
      this.call.hangUp();
      this.call.dispose();
      sessionStorage.clear();
    };

    window.addEventListener("beforeunload", function (e) {
      callCleanup();
      console.log("customer details unloading");
    });

    window.addEventListener("locationchange", function (e) {
      callCleanup();
      console.log("customer details locationchange");
    });

    window.addEventListener("popstate", function (e) {
      callCleanup();
      console.log("customer details popstate");
    });

    window.addEventListener("hashchange", function (e) {
      callCleanup();
      console.log("customer details hashchange");
    });
  }

  async componentWillMount() {
    if (this.call) {
      this.deviceManager.on("videoDevicesUpdated", async (e) => {
        let newCameraDeviceToUse = undefined;
        e.added.forEach((addedCameraDevice) => {
          newCameraDeviceToUse = addedCameraDevice;
          const addedCameraDeviceOption = {
            key: addedCameraDevice.id,
            text: addedCameraDevice.name,
          };
          this.setState((prevState) => ({
            cameraDeviceOptions: [
              ...prevState.cameraDeviceOptions,
              addedCameraDeviceOption,
            ],
          }));
        });
        // When connectnig a new camera, ts device manager automatically switches to use this new camera and
        // this.call.localVideoStream[0].source is never updated. Hence I have to do the following logic to update
        // this.call.localVideoStream[0].source to the newly added camera. This is a bug. Under the covers, this.call.localVideoStreams[0].source
        // should have been updated automatically by the sdk.
        if (newCameraDeviceToUse) {
          try {
            await this.call.localVideoStreams[0]?.switchSource(
              newCameraDeviceToUse
            );
            this.setState({ selectedCameraDeviceId: newCameraDeviceToUse.id });
          } catch (error) {
            console.error(
              "Failed to switch to newly added video device",
              error
            );
          }
        }

        e.removed.forEach((removedCameraDevice) => {
          this.setState((prevState) => ({
            cameraDeviceOptions: prevState.cameraDeviceOptions.filter(
              (option) => {
                return option.key !== removedCameraDevice.id;
              }
            ),
          }));
        });

        // If the current camera being used is removed, pick a new random one
        if (
          !this.state.cameraDeviceOptions.find((option) => {
            return option.key === this.state.selectedCameraDeviceId;
          })
        ) {
          const newSelectedCameraId = this.state.cameraDeviceOptions[0]?.key;
          const cameras = await this.deviceManager.getCameras();
          const videoDeviceInfo = cameras.find((c) => {
            return c.id === newSelectedCameraId;
          });
          await this.call.localVideoStreams[0]?.switchSource(videoDeviceInfo);
          this.setState({ selectedCameraDeviceId: newSelectedCameraId });
        }
      });

      this.deviceManager.on("audioDevicesUpdated", (e) => {
        e.added.forEach((addedAudioDevice) => {
          const addedAudioDeviceOption = {
            key: addedAudioDevice.id,
            text: addedAudioDevice.name,
          };
          if (addedAudioDevice.deviceType === "Speaker") {
            this.setState((prevState) => ({
              speakerDeviceOptions: [
                ...prevState.speakerDeviceOptions,
                addedAudioDeviceOption,
              ],
            }));
          } else if (addedAudioDevice.deviceType === "Microphone") {
            this.setState((prevState) => ({
              microphoneDeviceOptions: [
                ...prevState.microphoneDeviceOptions,
                addedAudioDeviceOption,
              ],
            }));
          }
        });

        e.removed.forEach((removedAudioDevice) => {
          if (removedAudioDevice.deviceType === "Speaker") {
            this.setState((prevState) => ({
              speakerDeviceOptions: prevState.speakerDeviceOptions.filter(
                (option) => {
                  return option.key !== removedAudioDevice.id;
                }
              ),
            }));
          } else if (removedAudioDevice.deviceType === "Microphone") {
            this.setState((prevState) => ({
              microphoneDeviceOptions: prevState.microphoneDeviceOptions.filter(
                (option) => {
                  return option.key !== removedAudioDevice.id;
                }
              ),
            }));
          }
        });
      });

      this.deviceManager.on("selectedSpeakerChanged", () => {
        this.setState({
          selectedSpeakerDeviceId: this.deviceManager.selectedSpeaker?.id,
        });
      });

      this.deviceManager.on("selectedMicrophoneChanged", () => {
        this.setState({
          selectedMicrophoneDeviceId: this.deviceManager.selectedMicrophone?.id,
        });
      });

      const callStateChanged = async () => {
        console.log("Call state changed ", this.call.state, this.call);
        this.setState({ callState: this.call.state });
        // this.setCallInstance(this.call);
        // this.setCallState(this.call.state);
        // this.setTotalParticipantCount(this.call.totalParticipantCount);

        if (
          this.call.state !== "None" &&
          this.call.state !== "Connecting" &&
          this.call.state !== "Incoming"
        ) {
          if (this.callFinishConnectingResolve) {
            this.callFinishConnectingResolve();
          }
        }
        if (this.call.state === "Incoming") {
          const cameraDevices = await this.deviceManager.getCameras();
          const speakerDevices = await this.deviceManager.getSpeakers();
          const microphoneDevices = await this.deviceManager.getMicrophones();

          this.setState({ selectedCameraDeviceId: cameraDevices[0]?.id });
          this.setState({ selectedSpeakerDeviceId: speakerDevices[0]?.id });
          this.setState({
            selectedMicrophoneDeviceId: microphoneDevices[0]?.id,
          });
        }

        if (this.call.state === "Disconnected") {
          this.setState({ dominantRemoteParticipant: undefined });
          this.call
            .stopVideo(this.call.localVideoStreams[0])
            .catch((error) => {});
          this.call.mute();
          console.log("abcd");
        }
      };
      callStateChanged();
      this.call.on("stateChanged", callStateChanged);

      this.call.on("idChanged", () => {
        console.log("Call id Changed ", this.call.id);
        this.setState({ callId: this.call.id });
      });

      this.call.on("isMutedChanged", () => {
        console.log("Local microphone muted changed ", this.call.isMuted);
        this.setState({ micMuted: this.call.isMuted });
      });

      this.call.on("isScreenSharingOnChanged", () => {
        this.setState({ screenShareOn: this.call.isScreenShareOn });
      });

      this.call.remoteParticipants.forEach((rp) =>
        this.subscribeToRemoteParticipant(rp)
      );
      this.call.on("remoteParticipantsUpdated", (e) => {
        console.log(
          `Call=${this.call.callId}, remoteParticipantsUpdated, added=${e.added}, removed=${e.removed}`
        );
        e.added.forEach((p) => {
          console.log("participantAdded", p);
          // this.setTotalParticipantCount(this.call.totalParticipantCount + 1);
          this.subscribeToRemoteParticipant(p);
        });
        e.removed.forEach((p) => {
          console.log("participantRemoved", p);
          // this.setTotalParticipantCount(this.call.totalParticipantCount - 1);
          if (p.callEndReason) {
            this.setState((prevState) => ({
              callMessage: `${
                prevState.callMessage ? prevState.callMessage + `\n` : ``
              }
                                        Remote participant ${utils.getIdentifierText(
                                          p.identifier
                                        )} disconnected: code: ${
                p.callEndReason.code
              }, subCode: ${p.callEndReason.subCode}.`,
            }));
          }
          this.setState({
            remoteParticipants: this.state.remoteParticipants.filter(
              (remoteParticipant) => {
                return remoteParticipant !== p;
              }
            ),
          });
          this.setState({
            streams: this.state.allRemoteParticipantStreams.filter((s) => {
              return s.participant !== p;
            }),
          });
        });
      });

      const dominantSpeakersChangedHandler = async () => {
        try {
          if (this.state.dominantSpeakerMode) {
            const newDominantSpeakerIdentifier = this.call.api(
              Features.DominantSpeakers
            ).dominantSpeakers.speakersList[0];
            if (newDominantSpeakerIdentifier) {
              console.log(
                `DominantSpeaker changed, new dominant speaker: ${
                  newDominantSpeakerIdentifier
                    ? utils.getIdentifierText(newDominantSpeakerIdentifier)
                    : `None`
                }`
              );

              // Set the new dominant remote participant
              const newDominantRemoteParticipant =
                utils.getRemoteParticipantObjFromIdentifier(
                  this.call,
                  newDominantSpeakerIdentifier
                );

              // Get the new dominant remote participant's stream tuples
              const streamsToRender = [];
              for (const streamTuple of this.state
                .allRemoteParticipantStreams) {
                if (
                  streamTuple.participant === newDominantRemoteParticipant &&
                  streamTuple.stream.isAvailable
                ) {
                  streamsToRender.push(streamTuple);
                  if (
                    !streamTuple.streamRendererComponentRef.current.getRenderer()
                  ) {
                    await streamTuple.streamRendererComponentRef.current.createRenderer();
                  }
                }
              }

              const previousDominantSpeaker =
                this.state.dominantRemoteParticipant;
              this.setState({
                dominantRemoteParticipant: newDominantRemoteParticipant,
              });

              if (previousDominantSpeaker) {
                // Remove the old dominant remote participant's streams
                this.state.allRemoteParticipantStreams.forEach(
                  (streamTuple) => {
                    if (streamTuple.participant === previousDominantSpeaker) {
                      streamTuple.streamRendererComponentRef.current.disposeRenderer();
                    }
                  }
                );
              }

              // Render the new dominany speaker's streams
              streamsToRender.forEach((streamTuple) => {
                streamTuple.streamRendererComponentRef.current.attachRenderer();
              });
            } else {
              console.warn("New dominant speaker is undefined");
            }
          }
        } catch (error) {
          console.error(error);
        }
      };

      const dominantSpeakerIdentifier = this.call.api(Features.DominantSpeakers)
        .dominantSpeakers.speakersList[0];
      if (dominantSpeakerIdentifier) {
        this.setState({
          dominantRemoteParticipant:
            utils.getRemoteParticipantObjFromIdentifier(
              dominantSpeakerIdentifier
            ),
        });
      }
      this.call
        .api(Features.DominantSpeakers)
        .on("dominantSpeakersChanged", dominantSpeakersChangedHandler);
    }
  }

  subscribeToRemoteParticipant(participant) {
    if (
      !this.state.remoteParticipants.find((p) => {
        return p === participant;
      })
    ) {
      this.setState((prevState) => ({
        remoteParticipants: [...prevState.remoteParticipants, participant],
      }));
    }

    participant.on("displayNameChanged", () => {
      console.log("displayNameChanged ", participant.displayName);
    });

    participant.on("stateChanged", () => {
      console.log(
        "Participant state changed",
        participant.identifier.communicationUserId,
        participant.state
      );
    });

    const addToListOfAllRemoteParticipantStreams = (participantStreams) => {
      if (participantStreams) {
        let participantStreamTuples = participantStreams.map((stream) => {
          return {
            stream,
            participant,
            streamRendererComponentRef: React.createRef(),
          };
        });
        participantStreamTuples.forEach((participantStreamTuple) => {
          if (
            !this.state.allRemoteParticipantStreams.find((v) => {
              return v === participantStreamTuple;
            })
          ) {
            this.setState((prevState) => ({
              allRemoteParticipantStreams: [
                ...prevState.allRemoteParticipantStreams,
                participantStreamTuple,
              ],
            }));
          }
        });
      }
    };

    const removeFromListOfAllRemoteParticipantStreams = (
      participantStreams
    ) => {
      participantStreams.forEach((streamToRemove) => {
        const tupleToRemove = this.state.allRemoteParticipantStreams.find(
          (v) => {
            return v.stream === streamToRemove;
          }
        );
        if (tupleToRemove) {
          this.setState({
            allRemoteParticipantStreams:
              this.state.allRemoteParticipantStreams.filter((streamTuple) => {
                return streamTuple !== tupleToRemove;
              }),
          });
        }
      });
    };

    const handleVideoStreamsUpdated = (e) => {
      addToListOfAllRemoteParticipantStreams(e.added);
      removeFromListOfAllRemoteParticipantStreams(e.removed);
    };

    addToListOfAllRemoteParticipantStreams(participant.videoStreams);
    participant.on("videoStreamsUpdated", handleVideoStreamsUpdated);
  }

  async handleVideoOnOff() {
    try {
      const cameras = await this.deviceManager.getCameras();
      const cameraDeviceInfo = cameras.find((cameraDeviceInfo) => {
        return cameraDeviceInfo.id === this.state.selectedCameraDeviceId;
      });
      let selectedCameraDeviceId = this.state.selectedCameraDeviceId;
      let localVideoStream;
      if (this.state.selectedCameraDeviceId) {
        localVideoStream = new LocalVideoStream(cameraDeviceInfo);
      } else if (!this.state.videoOn) {
        const cameras = await this.deviceManager.getCameras();
        selectedCameraDeviceId = cameras[0].id;
        localVideoStream = new LocalVideoStream(cameras[0]);
      }

      if (
        this.call.state === "None" ||
        this.call.state === "Connecting" ||
        this.call.state === "Incoming"
      ) {
        if (this.state.videoOn) {
          this.setState({ videoOn: false });
        } else {
          this.setState({ videoOn: true, selectedCameraDeviceId });
        }
        await this.watchForCallFinishConnecting();
        if (this.state.videoOn) {
          this.call.startVideo(localVideoStream).catch((error) => {});
        } else {
          this.call
            .stopVideo(this.call.localVideoStreams[0])
            .catch((error) => {});
        }
      } else {
        if (this.call.localVideoStreams[0]) {
          await this.call.stopVideo(this.call.localVideoStreams[0]);
        } else {
          await this.call.startVideo(localVideoStream);
        }
      }

      this.setState({ videoOn: this.call.localVideoStreams[0] ? true : false });
    } catch (e) {
      console.error(e);
    }
  }

  async watchForCallFinishConnecting() {
    return new Promise((resolve) => {
      if (
        this.state.callState !== "None" &&
        this.state.callState !== "Connecting" &&
        this.state.callState !== "Incoming"
      ) {
        resolve();
      } else {
        this.callFinishConnectingResolve = resolve;
      }
    }).then(() => {
      this.callFinishConnectingResolve = undefined;
    });
  }

  async handleMicOnOff() {
    try {
      if (!this.call.isMuted) {
        await this.call.mute();
      } else {
        await this.call.unmute();
      }
      this.setState({ micMuted: this.call.isMuted });
    } catch (e) {
      console.error(e);
    }
  }

  async handleHoldUnhold() {
    try {
      if (this.call.state === "LocalHold") {
        this.call.resume();
      } else {
        this.call.hold();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async handleScreenSharingOnOff() {
    try {
      if (this.call.isScreenSharingOn) {
        await this.call.stopScreenSharing();
      } else {
        await this.call.startScreenSharing();
      }
      this.setState({ screenShareOn: this.call.isScreenSharingOn });
    } catch (e) {
      console.error(e);
    }
  }

  async toggleDominantSpeakerMode() {
    try {
      if (this.state.dominantSpeakerMode) {
        // Turn off dominant speaker mode
        this.setState({ dominantSpeakerMode: false });
        // Render all remote participants's streams
        for (const streamTuple of this.state.allRemoteParticipantStreams) {
          if (
            streamTuple.stream.isAvailable &&
            !streamTuple.streamRendererComponentRef.current.getRenderer()
          ) {
            await streamTuple.streamRendererComponentRef.current.createRenderer();
            streamTuple.streamRendererComponentRef.current.attachRenderer();
          }
        }
      } else {
        // Turn on dominant speaker mode
        this.setState({ dominantSpeakerMode: true });
        // Dispose of all remote participants's stream renderers
        const dominantSpeakerIdentifier = this.call.api(
          Features.DominantSpeakers
        ).dominantSpeakers.speakersList[0];
        if (!dominantSpeakerIdentifier) {
          this.state.allRemoteParticipantStreams.forEach((v) => {
            v.streamRendererComponentRef.current.disposeRenderer();
          });

          // Return, no action needed
          return;
        }

        // Set the dominant remote participant obj
        const dominantRemoteParticipant =
          utils.getRemoteParticipantObjFromIdentifier(
            this.call,
            dominantSpeakerIdentifier
          );
        this.setState({ dominantRemoteParticipant: dominantRemoteParticipant });
        // Dispose of all the remote participants's stream renderers except for the dominant speaker
        this.state.allRemoteParticipantStreams.forEach((v) => {
          if (v.participant !== dominantRemoteParticipant) {
            v.streamRendererComponentRef.current.disposeRenderer();
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  cameraDeviceSelectionChanged = async (event, item) => {
    const cameras = await this.deviceManager.getCameras();
    const cameraDeviceInfo = cameras.find((cameraDeviceInfo) => {
      return cameraDeviceInfo.id === item.key;
    });
    const localVideoStream = this.call.localVideoStreams[0];
    if (localVideoStream) {
      localVideoStream.switchSource(cameraDeviceInfo);
    }
    this.setState({ selectedCameraDeviceId: cameraDeviceInfo.id });
  };

  speakerDeviceSelectionChanged = async (event, item) => {
    const speakers = await this.deviceManager.getSpeakers();
    const speakerDeviceInfo = speakers.find((speakerDeviceInfo) => {
      return speakerDeviceInfo.id === item.key;
    });
    this.deviceManager.selectSpeaker(speakerDeviceInfo);
    this.setState({ selectedSpeakerDeviceId: speakerDeviceInfo.id });
  };

  microphoneDeviceSelectionChanged = async (event, item) => {
    const microphones = await this.deviceManager.getMicrophones();
    const microphoneDeviceInfo = microphones.find((microphoneDeviceInfo) => {
      return microphoneDeviceInfo.id === item.key;
    });
    this.deviceManager.selectMicrophone(microphoneDeviceInfo);
    this.setState({ selectedMicrophoneDeviceId: microphoneDeviceInfo.id });
  };

  renderVideoFiller = () => {
    console.log(this.state.allRemoteParticipantStreams);
    let counter = 0;
    this.state.allRemoteParticipantStreams.forEach((v) => {
      if (!v.stream.isAvailable) {
        counter++;
      }
    });
    return counter === this.state.allRemoteParticipantStreams.length;
  };

  toggleChatWindow = () => {
    let toggleBadgeFlag = false;
    if (!this.state.showChat) {
      toggleBadgeFlag = false;
    }
    this.setState({
      showChat: !this.state.showChat,
      showChatBadge: toggleBadgeFlag,
    });
  };

  setShowChatBadge = (value) => {
    this.setState({
      showChatBadge: value,
    });
  };

  isChat = () => {
    this.setState({ showChat: false });
  };
  isStreamRendered = (isAvailable) => {
    this.setState({
      isAvailableStream: isAvailable,
    });
    // this.renderVideoFiller();
  };

  getparticipatePos = (pos) => {
    this.setState({ selectedPos: pos });
  };

  topView() {
    console.log("display name ----- ", this.state.displayName);
    const pos = this.state.selectedPos;
    let topView = null;
    console.log(pos);
    if (pos != undefined) {
      if (pos.videoStreams[1]._isAvailable) {
        topView = (
          <div
            className="flex items-center justify-center"
            style={{ width: "100%", height: "69vh" }}
          >
            <StreamRenderer
              key={`${utils.getIdentifierText(pos._identifier)}-${
                pos.videoStreams[1]._mediaStreamType
              }-${pos.videoStreams[1].id}`}
              stream={pos.videoStreams[1]}
              remoteParticipant={pos}
              dominantSpeakerMode={this.state.dominantSpeakerMode}
              dominantRemoteParticipant={this.state.dominantRemoteParticipant}
              selectedCameraDeviceId={this.state.selectedCameraDeviceId}
              deviceManager={this.deviceManager}
              sessionId={this.sessionId}
              customerName={pos._displayName}
              renderVideo={(value) => this.isStreamRendered(value)}
            />
          </div>
        );
      } else if (pos.videoStreams[0]._isAvailable) {
        topView = (
          <div style={{ width: "100%", height: "69vh" }}>
            <StreamRenderer
              key={`${utils.getIdentifierText(pos._identifier)}-${
                pos.videoStreams[0]._mediaStreamType
              }-${pos.videoStreams[0].id}`}
              stream={pos.videoStreams[0]}
              remoteParticipant={pos}
              dominantSpeakerMode={this.state.dominantSpeakerMode}
              dominantRemoteParticipant={this.state.dominantRemoteParticipant}
              selectedCameraDeviceId={this.state.selectedCameraDeviceId}
              deviceManager={this.deviceManager}
              sessionId={this.sessionId}
              customerName={pos._displayName}
              renderVideo={(value) => this.isStreamRendered(value)}
            />
          </div>
        );
      } else {
        topView = (
          <div style={{ width: "100%", height: "69vh" }}>
            <FluentThemeProvider>
              <VideoTile
                style={{ width: "200px", height: "69vh" }}
                displayName={pos._displayName}
                showMuteIndicator={true}
                isMuted={pos._isMuted}
                isMirrored={true}
              />
            </FluentThemeProvider>
          </div>
        );
      }
    } else {
      topView = (
        <div style={{ width: "100%", height: "69vh" }}>
          <FluentThemeProvider>
            <VideoTile
              style={{ width: "200px", height: "69vh" }}
              displayName={this.state.displayName}
              showMuteIndicator={false}
              // isMuted={pos._isMuted}
              // isMirrored={true}
            />
          </FluentThemeProvider>
        </div>
      );
    }
    return topView;
  }

  render() {
    const hangUpIcon: IIconProps = { iconName: "DeclineCall" };

    // console.log("\n\nstate variables - ", this.state);

    return (
      <div className="ms-Grid mt-2">
        <div className="ms-Grid-row">
          <div
            className={
              this.state.callState === "Connected" ||
              this.state.callState === "LocalHold" ||
              this.state.callState === "RemoteHold"
                ? // ? `ms-Grid-col ms-sm12 ms-lg12 ms-xl12 ms-xxl12 video-block flex flex-col-reverse`
                  `video-block flex flex-col-reverse md:flex-col`
                : "hidden"
            }
          >
            <div className="bg-black">
              <div className="call-header">
                <div>
                  {/* <img className="w-12 hidden md:block" src={RISELogo}></img> */}
                </div>
                <div className="call-icons">
                  <span
                    className="in-call-button "
                    title={`Turn your video ${
                      this.state.videoOn ? "off" : "on"
                    }`}
                    variant="secondary"
                    onClick={() => this.handleVideoOnOff()}
                  >
                    {this.state.videoOn && <Video28Filled />}
                    {!this.state.videoOn && <VideoOff28Filled />}
                  </span>
                  <span
                    className="in-call-button"
                    title={`${
                      this.state.micMuted ? "Unmute" : "Mute"
                    } your microphone`}
                    variant="secondary"
                    onClick={() => this.handleMicOnOff()}
                  >
                    {this.state.micMuted && <MicOff28Filled />}
                    {!this.state.micMuted && <MicOn28Filled />}
                  </span>
                  <span
                    className="in-call-button hide-in-mobile"
                    title={`${
                      this.state.screenShareOn ? "Stop" : "Start"
                    } sharing your screen`}
                    variant="secondary"
                    onClick={() => this.handleScreenSharingOnOff()}
                  >
                    {!this.state.screenShareOn && <ScreenShareStart48Regular />}
                    {this.state.screenShareOn && <Icon iconName="CircleStop" />}
                  </span>

                  <Separator
                    vertical
                    className={"vertical-separator hidden md:block"}
                  />
                  <span
                    className="in-call-button hidden md:block"
                    title="Settings"
                    variant="secondary"
                    onClick={() => this.setState({ showSettings: true })}
                  >
                    <Settings28Filled />
                  </span>
                  <DefaultButton
                    className={"leave-button"}
                    text="Leave"
                    iconProps={hangUpIcon}
                    onClick={() => this.call.hangUp()}
                  />
                  <Panel
                    type={PanelType.medium}
                    isLightDismiss
                    isOpen={this.state.showSettings}
                    onDismiss={() => this.setState({ showSettings: false })}
                    closeButtonAriaLabel="Close"
                    headerText="Settings"
                  >
                    <div className="pl-2 mt-3">
                      <h3>Video settings</h3>
                      <div className="pl-2">
                        <span>
                          <h4>Camera preview</h4>
                        </span>
                        <DefaultButton
                          onClick={() =>
                            this.setState({
                              showLocalVideo: !this.state.showLocalVideo,
                            })
                          }
                        >
                          Show/Hide
                        </DefaultButton>
                        {this.state.callState === "Connected" && (
                          <Dropdown
                            selectedKey={this.state.selectedCameraDeviceId}
                            onChange={this.cameraDeviceSelectionChanged}
                            label={"Camera"}
                            options={this.state.cameraDeviceOptions}
                            placeHolder={
                              this.state.cameraDeviceOptions.length === 0
                                ? "No camera devices found"
                                : this.state.selectedCameraDeviceId
                            }
                            styles={{ dropdown: { width: "100%" } }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="pl-2 mt-4">
                      <h3>Sound Settings</h3>
                      <div className="pl-2">
                        {this.state.callState === "Connected" && (
                          <Dropdown
                            selectedKey={this.state.selectedSpeakerDeviceId}
                            onChange={this.speakerDeviceSelectionChanged}
                            options={this.state.speakerDeviceOptions}
                            label={"Speaker"}
                            placeHolder={
                              this.state.speakerDeviceOptions.length === 0
                                ? "No speaker devices found"
                                : this.state.selectedSpeakerDeviceId
                            }
                            styles={{ dropdown: { width: "100%" } }}
                          />
                        )}
                        {this.state.callState === "Connected" && (
                          <Dropdown
                            selectedKey={this.state.selectedMicrophoneDeviceId}
                            onChange={this.microphoneDeviceSelectionChanged}
                            options={this.state.microphoneDeviceOptions}
                            label={"Microphone"}
                            placeHolder={
                              this.state.microphoneDeviceOptions.length === 0
                                ? "No microphone devices found"
                                : this.state.selectedMicrophoneDeviceId
                            }
                            styles={{ dropdown: { width: "100%" } }}
                          />
                        )}
                      </div>
                    </div>
                  </Panel>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 flex flex-row h-full">
              <div className="flex flex-col w-full">
                <div className="mb-1 flex-1 flex justify-center bg-white">
                  {this.topView()}
                </div>

                <div className="flex flex-row h-32 mb-1 ml-1 mr-1">
                  {this.state.remoteParticipants.map((v, index) => {
                    let view = null;
                    if (v.videoStreams[1]._isAvailable) {
                      view = (
                        <div
                          style={{ width: "200px", height: "7rem" }}
                          className="ml-2"
                          onClick={() => this.getparticipatePos(v)}
                        >
                          <StreamRenderer
                            key={`${utils.getIdentifierText(v._identifier)}-${
                              v.videoStreams[1]._mediaStreamType
                            }-${v.videoStreams[1].id}`}
                            stream={v.videoStreams[1]}
                            remoteParticipant={v}
                            dominantSpeakerMode={this.state.dominantSpeakerMode}
                            dominantRemoteParticipant={
                              this.state.dominantRemoteParticipant
                            }
                            selectedCameraDeviceId={
                              this.state.selectedCameraDeviceId
                            }
                            deviceManager={this.deviceManager}
                            sessionId={this.sessionId}
                            customerName={v._displayName}
                            renderVideo={(value) =>
                              this.isStreamRendered(value)
                            }
                          />
                        </div>
                      );
                    } else if (v.videoStreams[0]._isAvailable) {
                      view = (
                        <div
                          style={{ width: "200px", height: "7rem" }}
                          className="ml-2"
                          onClick={() => this.getparticipatePos(v)}
                        >
                          <StreamRenderer
                            key={`${utils.getIdentifierText(v._identifier)}-${
                              v.videoStreams[0]._mediaStreamType
                            }-${v.videoStreams[0].id}`}
                            stream={v.videoStreams[0]}
                            remoteParticipant={v}
                            dominantSpeakerMode={this.state.dominantSpeakerMode}
                            dominantRemoteParticipant={
                              this.state.dominantRemoteParticipant
                            }
                            selectedCameraDeviceId={
                              this.state.selectedCameraDeviceId
                            }
                            deviceManager={this.deviceManager}
                            sessionId={this.sessionId}
                            customerName={v._displayName}
                            renderVideo={(value) =>
                              this.isStreamRendered(value)
                            }
                          />
                        </div>
                      );
                    } else {
                      view = (
                        <div
                          style={{ width: "200px", height: "7rem" }}
                          className="ml-2"
                          onClick={() => this.getparticipatePos(v)}
                        >
                          <FluentThemeProvider>
                            <VideoTile
                              style={{ width: "200px", height: "7rem" }}
                              displayName={v._displayName}
                              showMuteIndicator={true}
                              isMuted={v._isMuted}
                              isMirrored={true}
                            />
                          </FluentThemeProvider>
                        </div>
                      );
                    }

                    return view;
                  })}
                </div>
              </div>
            </div>

            <div className="mobile-head-container flex p-2 px-1 items-center block md:hidden fixed top-0 left-0 right-0">
              <div className="head-cub-container flex p-2 rounded-md flex-1 items-center">
                {this.state.showChat && (
                  <Icon
                    iconName="ChevronLeft"
                    className="text-white"
                    onClick={() => this.toggleChatWindow()}
                  ></Icon>
                )}

                <div className="flex flex-1 flex-col ml-3">
                  <span className={`text-sm font-bold text-left text-white `}>
                    {this.displayName}
                  </span>
                  {/* <span className="text-xs text-left text-white">00:05</span> */}
                </div>
                <div className="flex items-center relative">
                  <span
                    className="text-base text-white"
                    onClick={() => this.toggleChatWindow()}
                  >
                    {this.state.showChat ? <Chat28Filled /> : <Chat28Regular />}
                    {this.state.showChatBadge ? (
                      <div
                        className="chat-badge inset-0"
                        style={{
                          top: "3px",
                          right: "0px",
                          left: "19px",
                        }}
                      ></div>
                    ) : null}
                  </span>
                  <span className={`text-base text-white ml-2 `}>
                    <People28Regular />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
