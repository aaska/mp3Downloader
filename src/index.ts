import * as process from "process";
import * as fs from "fs";
import fetch from "node-fetch";
import { spawnSync } from "child_process";

const savedPath = "/tmp/"; /* change this to define the download path */
const temp = "/tmp";
interface IMP3List {
  title: string;
  url: string;
  filename: string;
}
async function fetchMp3(source: IMP3List[]) {
  for (let s of source) {
    let split = s.url.split(".");
    s.filename = s.title.replace(
      /[ ()\.\/\[\]\\#\+\-\=\$\@\!\%\^\&\*\-\_\?\<\>\,\.\:\;\'\"]/g,
      ""
    ) + "." + split[split.length-1].split("?")[0];

    let localPath = `${savedPath}raw-${s.filename}`;
    let finalPath = `${savedPath}${s.filename.split(".")[0]}.mp3`;
    let tempPath = `${savedPath}${s.filename.split(".")[0]}-tmp.mp3`
    let voicePath = `${savedPath}${s.filename.split(".")[0]}-voice.mp3`;
    let ttsPath = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURI(s.title)}&tl=fr&total=1&idx=0&textlen=${encodeURI(s.title).length}`
    console.log(localPath);
    let dest = fs.createWriteStream(localPath);
    let destvoice = fs.createWriteStream(voicePath);
    console.log(`[${s.title}] - fetching ${s.filename}`);
    let resvoice = await fetch(ttsPath);
    let buffervoice = await resvoice.buffer();
    let res = await fetch(s.url);
    let buffer = await res.buffer();


    await destvoice.write(buffervoice);
    await dest.write(buffer);
    dest.close();
    destvoice.close();
    let p = spawnSync(
      "ffmpeg",
      [
        `-y`,
        `-i ${localPath}`, // input file
        "-ar 44100",
        "-ac 1",
        // `-map 0 -map_metadata 0:s:0`,
        "-acodec libmp3lame",
        `${tempPath}`, // output file
      ],
      { shell: true }
    );

    // console.log("-----------------", p.stderr.toString());

    let i = spawnSync(
      "ffmpeg",
      [
        `-y`,
        `-i ${localPath}`,
        "-an",
        "-vcodec copy",
        `${finalPath}.png`  
      ],
      { shell: true }
    );
    let j = spawnSync(
      "ffmpeg",
      [
        `-y`,
        `-i ${tempPath}`,
        "-map 0:a -codec:a copy -map_metadata -1",
        `${finalPath}`
      ],
      { shell: true }
    )
    // console.log("-----------------", j.stderr.toString());

    fs.unlink(`${tempPath}`, (err) => console.log(err));
    fs.unlink(localPath, (err) => console.log(err)); // removing working file.
  }
}


async function getRss(url: string) {
  // let rss = await (await fetch(url)).text();
  let Parser = require("rss-parser");
  let parser = new Parser();
  let mp3list: IMP3List[] = [];

  //const parser = new Parser();

  let feed = await parser.parseURL(url);

  feed.items.forEach((i) => {
    mp3list.push({
      title: i.title,
      url: i.enclosure.url,
      filename: ""
    });
    // console.log(i.title + ':' + i.enclosure.url);
  });

  await fetchMp3(mp3list);
}

async function listener(e: any) {
  let entry: String = e.toString().trim();
  let args = entry.split(" ");
  let value = e.toString().trim();

  console.log(`[${value}]`);

  await getRss(value);
}

// start();

let stdin = process.openStdin();
stdin.addListener("data", listener);
