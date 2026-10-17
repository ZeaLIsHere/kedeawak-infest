export type SpeechRecognitionInstance={lang:string;continuous:boolean;interimResults:boolean;onresult:((event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void)|null;onerror:(()=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};
export type SpeechConstructor=new()=>SpeechRecognitionInstance;
export function speechConstructor<T>(scope:{SpeechRecognition?:T;webkitSpeechRecognition?:T}):T|undefined{return scope.SpeechRecognition??scope.webkitSpeechRecognition;}
