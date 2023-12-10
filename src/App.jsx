import React, { useRef, useEffect, useState } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

const App = () => {
  
  const [records, setRecords] = useState([]);

  const videoElement = useRef(null);
  const startButtonElement = useRef(null);
  const stopButtonElement = useRef(null);

  const shouldRecordRef = useRef(false);
  const modelRef = useRef(null);
  const recordingRef = useRef(false);
  const lastDetectionsRef = useRef([]);
  const recorderRef = useRef(null);

  useEffect(() => {
    async function prepare() {
      startButtonElement.current.setAttribute("disabled", true);
      stopButtonElement.current.setAttribute("disabled", true);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
          window.stream = stream;
          videoElement.current.srcObject = stream;
          const model = await cocoSsd.load();

          modelRef.current = model;
          startButtonElement.current.removeAttribute("disabled");
        } catch (error) {
          console.error(error);
        }
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    const fetchVideos = async () => {
      const keys = Object.keys(localStorage);
      const storedRecords = await Promise.all(
        keys
          .filter((key) => key.startsWith("video_record_"))
          .map(async (key) => {
            const videoData = JSON.parse(localStorage.getItem(key));
            // You may want to add additional checks to ensure video content is available
            // before including it in the result.
            return videoData;
          })
      );

      // Sort videos based on timestamp (assuming title is a timestamp string)
      storedRecords.sort((a, b) => new Date(b.title) - new Date(a.title));

      // Update state with sorted videos
      setRecords(storedRecords);
    };

    // Add a delay to give the video element time to initialize after component mount
    const delay = 2000; // Adjust the delay as needed
    setTimeout(() => {
      fetchVideos();
    }, delay);
  }, []);

  async function detectFrame() {
    if (!shouldRecordRef.current) {
      stopRecording();
      return;
    }

    const predictions = await modelRef.current.detect(videoElement.current);

    let foundPerson = false;
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i].class === "person") {
        foundPerson = true;
      }
    }

    if (foundPerson) {
      startRecording();
      lastDetectionsRef.current.push(true);
    } else if (lastDetectionsRef.current.filter(Boolean).length) {
      startRecording();
      lastDetectionsRef.current.push(false);
    } else {
      stopRecording();
    }

    lastDetectionsRef.current = lastDetectionsRef.current.slice(
      Math.max(lastDetectionsRef.current.length - 10, 0)
    );

    requestAnimationFrame(() => {
      detectFrame();
    });
  }

  function startRecording() {
    if (recordingRef.current) {
      return;
    }

    recordingRef.current = true;
    console.log("start recording");

    recorderRef.current = new MediaRecorder(window.stream);
    const chunks = [];

    recorderRef.current.ondataavailable = function (e) {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorderRef.current.onstop = function () {
      const blob = new Blob(chunks, { type: "video/webm" });
      const title = new Date() + "";
      const href = URL.createObjectURL(blob);
      setRecords((previousRecords) => {
        // Save the video data in localStorage
        const videoData = { title, href };
        localStorage.setItem("video_record_" + title, JSON.stringify(videoData));
        // Add the new video at the beginning of the array
        return [videoData, ...previousRecords];
      });
    };

    recorderRef.current.start();
  }

  function stopRecording() {
    if (!recordingRef.current) {
      return;
    }

    recordingRef.current = false;
    recorderRef.current.stop();
    console.log("stopped recording");
    lastDetectionsRef.current = [];
  }

  return (
    <div className="p-3 main">
      <div>
        <video autoPlay playsInline muted ref={videoElement} />
        <div className="btn-toolbar" role="toolbar">
          <div className="btn-group mr-2" role="group">
            <button
              className="btn btn-success"
              onClick={() => {
                shouldRecordRef.current = true;
                stopButtonElement.current.removeAttribute("disabled");
                startButtonElement.current.setAttribute("disabled", true);
                detectFrame();
              }}
              ref={startButtonElement}
            >
              Start
            </button>
          </div>
          <div className="btn-group mr-2" role="group">
            <button
              className="btn btn-danger"
              onClick={() => {
                shouldRecordRef.current = false;
                startButtonElement.current.removeAttribute("disabled");
                stopButtonElement.current.setAttribute("disabled", true);
                stopRecording();
              }}
              ref={stopButtonElement}
            >
              Stop
            </button>
          </div>
        </div>
      </div>
      <div>
        <h3>Records:</h3>
        <div className="row p-3">
          {!records.length ? null : (
            records.map((record) => {
              return (
                <div className="card mt-3 w-100" key={record.title}>
                  <div className="card-body">
                    <h5 className="card-title">{record.title}</h5>
                    <video className="vio" width="450px" id="playerVideo" controls src={record.href} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
