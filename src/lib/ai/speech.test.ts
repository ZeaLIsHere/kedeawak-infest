import { describe,it,expect } from "vitest";
import { speechConstructor } from "./speech";
it("memilih pengenal suara yang disediakan peramban",()=>{const c=class {};expect(speechConstructor({webkitSpeechRecognition:c})).toBe(c);expect(speechConstructor({})).toBeUndefined();});
