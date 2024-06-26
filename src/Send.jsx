import React, { useEffect, useState } from "react"
import {
  AgoraVideoPlayer,
  createClient,
  createMicrophoneAndCameraTracks
} from "agora-rtc-react"

const config = {
  mode: "live",
  codec: "vp8"
}

const appId = "8c59aaf317f947d7a5fcd8adba54b880" 

const Send = () => {
  const [inCall, setInCall] = useState(false)
  const [channelName, setChannelName] = useState("")
  const [host, setHost] = useState(false)
  return (
    <div>
     
      {inCall ? (
        <VideoCall
          setInCall={setInCall}
          channelName={channelName}
          host={host}
        />
      ) : (
        <ChannelForm
          setInCall={setInCall}
          setChannelName={setChannelName}
          setHost={setHost}
        />
      )}
    </div>
  )
}

// the create methods in the wrapper return a hook
// the create method should be called outside the parent component
// this hook can be used the get the client/stream in any component
const useClient = createClient(config)
const useMicrophoneAndCameraTracks = createMicrophoneAndCameraTracks()

const VideoCall = props => {
  const { setInCall, channelName } = props
  const [users, setUsers] = useState([])
  const [start, setStart] = useState(false)
  const { host } = props

  // using the hook to get access to the client object
  const client = useClient()
  // ready is a state variable, which returns true when the local tracks are initialized, untill then tracks variable is null
  const { ready, tracks } = useMicrophoneAndCameraTracks()

  useEffect(() => {
    console.log("role is", host)
    // function to initialise the SDK
    let init = async name => {
      if (host === false) {
        await client.setClientRole("audience")
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType)
          console.log("subscribe success")
          if (mediaType === "video") {
            setUsers(prevUsers => {
              return [...prevUsers, user]
            })
          }
          if (mediaType === "audio") {
            user.audioTrack?.play()
          }
        })

        client.on("user-unpublished", (user, type) => {
          console.log("unpublished", user, type)
          if (type === "audio") {
            user.audioTrack?.stop()
          }
          if (type === "video") {
            setUsers(prevUsers => {
              return prevUsers.filter(User => User.uid !== user.uid)
            })
          }
        })

        client.on("user-left", user => {
          console.log("leaving", user)
          setUsers(prevUsers => {
            return prevUsers.filter(User => User.uid !== user.uid)
          })
        })
      }
    }

    if (ready && tracks) {
      console.log("init ready")
      init(channelName)

      fetch(
        `https://us-central1-agore-node-express.cloudfunctions.net/app/access_token?channelName=${channelName}`
      ).then(function(response) {
        response.json().then(async function(data) {
          let token = data.token
          console.log("Error to acquire", token)
          await client.join(appId, channelName, token, null)
          if (tracks && host === true) {
            await client.setClientRole("host")
            await client.publish([tracks[0], tracks[1]])
          }
          setStart(true)
        })
      })
    }
  }, [channelName, client, ready, tracks])

  return (
    <div className="App">
      {ready && tracks && (
        <Controls tracks={tracks} setStart={setStart} setInCall={setInCall} />
      )}
      {start && tracks && <Videos users={users} tracks={tracks} host={host} />}
    </div>
  )
}

const Videos = props => {
  const { users, tracks, host } = props

  return (
    <div>
     
        {users.length > 0 &&
          users.map(user => {
            if (user.videoTrack) {
              return (
                <AgoraVideoPlayer
                  className="vid"
                  videoTrack={user.videoTrack}
                  key={user.uid}
                  style={{ height: "600px", width: "600px" }}
                />
              )
            } else return null
          })}
      </div>
    // </div>
  )
}

export const Controls = props => {
  const client = useClient()
  const { tracks, setStart, setInCall } = props
  const [trackState, setTrackState] = useState({ video: true, audio: true })

  const mute = async type => {
    if (type === "audio") {
      await tracks[0].setEnabled(!trackState.audio)
      setTrackState(ps => {
        return { ...ps, audio: !ps.audio }
      })
    } else if (type === "video") {
      await tracks[1].setEnabled(!trackState.video)
      setTrackState(ps => {
        return { ...ps, video: !ps.video }
      })
    }
  }

  const leaveChannel = async () => {
    await client.leave()
    client.removeAllListeners()
    // we close the tracks to perform cleanup
    tracks[0].close()
    tracks[1].close()
    setStart(false)
    setInCall(false)
  }

  return (
    <div className="controls">
      <p className={trackState.audio ? "on" : ""} onClick={() => mute("audio")}>
        {trackState.audio ? "MuteAudio" : "UnmuteAudio"}
      </p>
      <p className={trackState.video ? "on" : ""} onClick={() => mute("video")}>
        {trackState.video ? "MuteVideo" : "UnmuteVideo"}
      </p>
      {<p onClick={() => leaveChannel()}>Leave</p>}
    </div>
  )
}

const ChannelForm = props => {
  const { setInCall, setChannelName, setHost } = props

  return (
    <form className="join">
      {appId === "" && (
        <p style={{ color: "red" }}>
          Please enter your Agora App ID in App.tsx and refresh the page
        </p>
      )}
    <input
        type="text"
        placeholder="Enter Channel Name"
        onChange={e => setChannelName(e.target.value)}
      /> 
      <button
        onClick={e => {
          e.preventDefault()
          setInCall(true)
          setHost(true)
        }}
      >
        Host
      </button>
      <button
        onClick={e => {
          e.preventDefault()
          setInCall(true)
          setHost(false)
        }}
      >
        Join as Audience
      </button> 
    </form>
  )
}

export default Send
