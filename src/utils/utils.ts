import { spawnSync } from "child_process";
import * as fs from "fs";
import fetch from "node-fetch";

/**
 * Creates an image compatible with Lunii
 * @param path location where image will be saved
 * @param text text to put the image
 */
export function createLuniiImage(path: string, text: string) {
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

/**
 * Returns the filename from a full path
 * @param path path to retrieve the filename from
 */
export function getFileName(path: string): string {
  return path.split("/")[path.split("/").length - 1];
}

/**
 * Download a TTS mp3 from a text
 * @param path location to save the TTS output
 * @param text text to TTS
 */
export async function downloadTTSVoice(path: string, text: string) {
  let sanitizedText = text.replace(/\//g, " sur ");
  let ttsPath = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURI(
    sanitizedText
  )}&tl=fr&total=1&idx=0&textlen=${encodeURI(sanitizedText).length}`;
  await downloadToFile(ttsPath, path);
}

/**
 * Download a file to a local location
 * @param url location of the document to download
 * @param output location to save the output
 */
export async function downloadToFile(url: string, output: string) {
  let dst = fs.createWriteStream(output);
  let buffer = await (await fetch(url)).buffer();
  await dst.write(buffer);
  dst.close();
}

/**
 * Sanitize a text to be compatible with a local save
 * @param text text to sanitize
 * @param supplemental additional parameters
 */
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
