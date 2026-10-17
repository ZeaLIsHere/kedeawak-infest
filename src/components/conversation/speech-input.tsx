"use client";
import {useEffect,useRef,useState} from "react";
import {Mic,Square} from "lucide-react";
import {Button} from "@/components/ui/button";
import {speechConstructor,type SpeechConstructor,type SpeechRecognitionInstance} from "@/lib/ai/speech";
const RECOGNITION_LANGUAGE = "id-ID"; // lint-ui-ignore: kode bahasa Web Speech API, bukan teks antarmuka
export function SpeechInput({onTranscript,disabled=false}:{onTranscript:(text:string)=>void;disabled?:boolean}){
 const [supported,setSupported]=useState(false);const [listening,setListening]=useState(false);const [error,setError]=useState(""); const recognition=useRef<SpeechRecognitionInstance|null>(null);
 useEffect(()=>{setSupported(!!speechConstructor(window as unknown as {SpeechRecognition?:SpeechConstructor;webkitSpeechRecognition?:SpeechConstructor}));return()=>recognition.current?.abort();},[]);
 function start(){
  const Constructor=speechConstructor(window as unknown as {SpeechRecognition?:SpeechConstructor;webkitSpeechRecognition?:SpeechConstructor});if(!Constructor)return;
  try{const instance=new Constructor();recognition.current=instance;instance.lang=RECOGNITION_LANGUAGE;instance.continuous=false;instance.interimResults=false;instance.onresult=e=>{const text=e.results[0]?.[0]?.transcript;if(text)onTranscript(text);};instance.onerror=()=>{setError("Suara belum dapat dikenali. Gunakan kolom ketik.");setListening(false);};instance.onend=()=>setListening(false);setError("");instance.start();setListening(true);}catch{setError("Mikrofon belum dapat digunakan. Gunakan kolom ketik.");setListening(false);}
 }
 return <div className="space-y-2">{supported?<Button type="button" variant="outline" className="min-h-11" disabled={disabled} onClick={()=>listening?recognition.current?.stop():start()}>{listening?<Square aria-hidden="true"/>:<Mic aria-hidden="true"/>}{listening?"Selesai bicara":"Gunakan suara"}</Button>:<p className="text-sm text-muted-foreground">Peramban ini belum mendukung perintah suara. Gunakan kolom ketik.</p>}{error&&<p role="status" className="text-sm text-destructive">{error}</p>}</div>;
}

