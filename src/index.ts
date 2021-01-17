import * as process from "process";
import * as fs from "fs";
import fetch from "node-fetch";
import { spawnSync } from "child_process";
import { StudioBuilder } from "./StudioBuilder";

export const savedPath = process.env.HOME + "/mp3Downloader/"; // Change here for folder
const temp = "/tmp";
export interface IMP3List {
  title: string;
  url: string;
  filename: string;
  voicePath: string;
  imagePath: string;
  storyPath: string;
}

async function downloadToFile(url: string, output: string) {
  let dst = fs.createWriteStream(output);
  let buffer = await (await fetch(url)).buffer();
  await dst.write(buffer);
  dst.close();
}

async function fetchMp3(source: IMP3List[]) {
  for (let s of source) {
    let split = s.url.split(".");
    s.filename =
      s.title.replace(
        /[ ()\.\/\[\]\\#\+\-\=\$\@\!\%\^\&\*\-\_\?\<\>\,\.\:\;\'\"]/g,
        ""
      ) +
      "." +
      split[split.length - 1];
    s.filename = s.filename
      .split("?")[0]
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    let baseName = `${savedPath}${s.filename.split(".")[0]}`;

    let localPath = `${savedPath}raw-${s.filename}`;
    s.storyPath = `${baseName}.mp3`;
    let tempPath = `${baseName}-tmp.mp3`;
    s.voicePath = `${baseName}-voice.mp3`;
    s.imagePath = `${baseName}.png`;
    let ttsPath = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURI(
      s.title
    )}&tl=fr&total=1&idx=0&textlen=${encodeURI(s.title).length}`;
    console.log(localPath);
    await downloadToFile(s.url, localPath);
    await downloadToFile(ttsPath, s.voicePath);

    console.log(`[${s.title}] - fetching ${s.filename}`);

    // Creating node image with ImageMagick
    let k = spawnSync(
      "convert",
      [
        `-size 320x240 -background black`,
        `-font Courier-bold -gravity center`,
        `+repage -strip -depth 4 -type palette`,
        `-alpha off +profile '!exif,*'`,
        `-fill white`,
        `caption:"${s.title.replace('"', '\\"')}"`,
        s.imagePath
      ],
      { shell: true }
    );
    console.log(k.stderr.toString());

    // Converting mp3 to mono
    let p = spawnSync(
      "ffmpeg",
      [
        `-y`,
        `-i ${localPath}`, // input file
        "-ar 44100",
        "-ac 1",
        // `-map 0 -map_metadata 0:s:0`,
        "-acodec libmp3lame",
        `${tempPath}` // output file
      ],
      { shell: true }
    );

    // Extracting images from mp3 id3 if any
    let i = spawnSync(
      "ffmpeg",
      [
        `-y`,
        `-i ${localPath}`,
        "-an",
        "-vcodec copy",
        `${s.storyPath}-mp3.png`
      ],
      { shell: true }
    );

    // Removing images from mp3
    let j = spawnSync(
      "ffmpeg",
      [
        `-y`,
        `-i ${tempPath}`,
        "-map 0:a -codec:a copy -map_metadata -1",
        `${s.storyPath}`
      ],
      { shell: true }
    );

    fs.unlink(`${tempPath}`, (err) => console.log(err));
    fs.unlink(localPath, (err) => console.log(err)); // removing working file.
  }
}

async function getRss(url: string) {
  let Parser = require("rss-parser");
  let parser = new Parser();
  let mp3list: IMP3List[] = [];

  let feed = await parser.parseURL(url);

  feed.items.forEach((i) => {
    mp3list.push({
      title: i.title,
      url: i.enclosure.url,
      filename: "",
      imagePath: "",
      storyPath: "",
      voicePath: ""
    });
  });

  if (!fs.existsSync(savedPath)) fs.mkdirSync(savedPath);

  await fetchMp3(mp3list);
  new StudioBuilder(mp3list);
}

async function listener(e: any) {
  let entry: String = e.toString().trim();
  let args = entry.split(" ");
  let value = e.toString().trim();

  console.log(`[${value}]`);

  await getRss(value);
}

console.log("Enter RSS URL : ");

let stdin = process.openStdin();
stdin.addListener("data", listener);
