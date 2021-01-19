import { spawnSync } from "child_process";
import * as fs from "fs";
import fetch from "node-fetch";

export function createLuniiImage(path: string, text: string) {
  // Creating node image with ImageMagick
  let k = spawnSync(
    "convert",
    [
      `-size 320x240 -background black`,
      `-font Courier-bold -gravity center`,
      `+repage -strip -depth 4 -type palette`,
      `-alpha off +profile '!exif,*'`,
      `-fill white`,
      `caption:"${text.replace('"', '\\"')}"`,
      path
    ],
    { shell: true }
  );
  console.log(k.stderr.toString());
}

export function getFileName(path: string): string {
  return path.split("/")[path.split("/").length - 1];
}

export async function downloadTTSVoice(path: string, text: string) {
  let sanitizedText = text.replace(/\//g, " sur ");
  let ttsPath = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURI(
    sanitizedText
  )}&tl=fr&total=1&idx=0&textlen=${encodeURI(sanitizedText).length}`;
  await downloadToFile(ttsPath, path);
}

export async function downloadToFile(url: string, output: string) {
  let dst = fs.createWriteStream(output);
  let buffer = await (await fetch(url)).buffer();
  await dst.write(buffer);
  dst.close();
}

export function sanitizeFileName(
  text: string,
  ...supplemental: string[]
): string {
  let stext = text
    .concat(supplemental.join())
    .replace(/[ ()\.\/\[\]\\#\+\=\$\@\!\%\^\&\*\-\_\?\<\>\,\.\:\;\'\"]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  // stext = stext;
  return stext;
}
