const { all } = require('./database');
async function check() {
  try {
    const tables = await all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log(tables);
  } catch (e) {
    console.error(e);
  }
}
check();
