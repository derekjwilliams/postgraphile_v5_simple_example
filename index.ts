import express from "express";
import { createServer } from "node:http";
import { postgraphile } from "postgraphile";
import { makePgService } from "postgraphile/adaptors/pg";
import { grafserv } from "postgraphile/grafserv/express/v4";
import { PostGraphileAmberPreset } from "postgraphile/presets/amber";

/** @type {GraphileConfig.Preset} */
const preset = {
  extends: [PostGraphileAmberPreset],
  pgServices: [
    makePgService({
      connectionString: "postgres://yourusername:yourpassword@localhost:5432/yourdatabase",
      schemas: ["yourschema"],
    }),
  ],
  grafast: {
    explain: true,
  },
};
(async () => {
  const app = express();
  const server = createServer(app);
  server.on("error", (e) => {
    console.dir(e);
  });
  const pgl = postgraphile(preset);
  const serv = pgl.createServ(grafserv);
  await serv.addTo(app, server);
  server.listen(5050, () => {
    console.log("Server listening at http://localhost:5050");
  })
})();
