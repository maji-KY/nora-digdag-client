import {homedir} from "os";
import {createReadStream} from "fs";
import {createInterface} from "readline";

const configPath = `${homedir()}/.config/digdag/config`;

function extractKeyValue(line: string) {
  const [v1, v2] = line.split("=");
  return {"key": v1.trim(), "value": v2.trim()};
}

export function readConfig() {
  return new Promise(function(resolve, reject) {
    const config = {};
    const stream = createReadStream(configPath, "utf8");
    const reader = createInterface({"input": stream});
    reader.on("line", (line: string) => {
      const {key, value} = extractKeyValue(line);
      config[key] = value;
    });
    reader.on("close", () => {
      resolve(config);
    });
    stream.on("error", (e) => {
      reject(e);
    });
  });
}
