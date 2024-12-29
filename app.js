const net = require("net");
const express = require("express");

const [d1090_host, d1090_port] = (process.env.D1090 || "localhost:30003").split(":");
const los_sec = 60;
const age_out = 3600;
const port = 3000;

const client = new net.Socket();
client.connect(d1090_port, d1090_host);

let flights = {};

client.on("data", function(chunk) {
    const [, type,,, id,,,,,, callsign, altitude,,, latitude, longitude] = chunk.toString().split(",");
    if (!(id in flights)) {
        flights[id] = { nav:[] };
    }
    if (callsign) {
        flights[id].callsign = callsign;
    }
    if (type == 3) {
        flights[id].nav.push({
            altitude: parseInt(altitude),
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
        });
    }
    flights[id].state = true;
    flights[id].updated = Date.now() / 1000;
});

function prune() {
    const now = Date.now() / 1000;
    for (const id in flights) {
        if (now > flights[id].updated + age_out) {
            console.log("removing: " + id);
            delete flights[id];
        } else {
            flights[id].state = now < flights[id].updated + los_sec;
        }
    }
}

setInterval(prune, 10000);

const app = express();
app.use(express.static("public"));
app.get("/data", (req, res) => {
    res.json(flights);
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

