import { seedAll } from "../src/lib/seed";

seedAll({ flush: true })
  .then((r) => { console.log(JSON.stringify(r.counts)); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
