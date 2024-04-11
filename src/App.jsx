import React, { useRef,useState, useEffect } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebaseCOnfig"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "./firebaseCOnfig"; 
import './App.css'
import Send from './Send.jsx'
const App = () => {

  const [isRecording, setIsRecording] = useState(false);

  const videoElement = useRef(null);
  const modelRef = useRef(null);
  const recorderRef = useRef(null);
  const lastDetectionsRef = useRef([]);

  useEffect(() => {
    async function prepare() {
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
          detectFrame();
        } catch (error) {
          console.error(error);
        }
      }
    }

    prepare();
  }, []);

  async function detectFrame() {
    const predictions = await modelRef.current.detect(videoElement.current);

    let foundPerson = false;
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i].class === "person") {
        foundPerson = true;
        break;
      }
    }

    if (foundPerson) {
      lastDetectionsRef.current.push(true);
      startRecording();

    } else if (lastDetectionsRef.current.filter(Boolean).length) {
      startRecording();
      lastDetectionsRef.current.push(false);
    } 
    else {
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
    if (recorderRef.current) {
      return;
    }

    console.log("start recording");
    setIsRecording(true);

    recorderRef.current = new MediaRecorder(window.stream);
    const chunks = [];

    recorderRef.current.ondataavailable = function (e) {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    var currentdate = new Date();
    var datetime = currentdate.getDay() + "/" + currentdate.getMonth()
      + "/" + currentdate.getFullYear() + " @ "
      + currentdate.getHours() + ":"
      + currentdate.getMinutes() + ":" + currentdate.getSeconds();


    recorderRef.current.onstop = async function () {
      const blob = new Blob(chunks, { type: "video/webm" });
      const title = new Date() + "";
      const storageRef = ref(storage, "videos/" + title);
      try {
        await uploadBytes(storageRef, blob);

        const url = await getDownloadURL(storageRef);

       
        await addDoc(collection(firestore, "videos"), {
          videoUrl: url,
          vidTitle: title
        });
      } catch (error) {
        console.error("Error uploading video:", error);
      }
    };

    recorderRef.current.start();
  }

  function stopRecording() {
    if (!recorderRef.current) {
      return;
    }

    recorderRef.current.stop();
    recorderRef.current = null;
    console.log("stopped recording");
    lastDetectionsRef.current = [];
  }

  return (
    <div className="camera ">
      <Send />
       <h1 className="heading">Betie</h1>
         <video autoPlay playsInline muted ref={videoElement} />
          {isRecording ? <p>Recording in progress...</p> : <p>Still nothing detected</p>}
          
    </div>
  );
};

export default App;
