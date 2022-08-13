import {app} from './support/js/mount-app/embedded.js';
import t from 'tap';

t.test('Mount app', async t => {
  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Home directory', async t => {
    t.ok(app.home);
    t.ok(await app.home.exists());
    t.ok(await app.home.child('embedded.js').exists());
  });

  await t.test('Hello World', async () => {
    (await ua.getOk('/')).statusIs(200).bodyIs('Hello MountApp!');
  });

  await t.test('Full app', async () => {
    (await ua.getOk('/mount/full')).statusIs(200).bodyIs('Hello Mojo!');
    (await ua.getOk('/mount/full/foo')).statusIs(200).bodyIs('Action works!');
    (await ua.getOk('/mount/full/FOO')).statusIs(200).bodyIs('Action works!');
    (await ua.getOk('/mount/full/foo/baz')).statusIs(200).bodyIs('Multiple levels');
    (await ua.getOk('mount/full/variants?device=tablet')).statusIs(200).bodyIs('Variant: Tablet!\n\n');
    (await ua.getOk('mount/full/static/test.txt'))
      .statusIs(200)
      .headerExists('Content-Length')
      .bodyLike(/Static file\r?\n/);
    (await ua.getOk('/mount/full/does/not/exist')).statusIs(404);
  });

  await t.test('Full app (mounted again)', async () => {
    (await ua.getOk('/mount/full-two')).statusIs(200).bodyIs('Hello Mojo!');
    (await ua.getOk('mount/full-two/variants?device=tablet')).statusIs(200).bodyIs('Variant: Tablet!\n\n');
    (await ua.getOk('mount/full-two/static/test.txt'))
      .statusIs(200)
      .headerExists('Content-Length')
      .bodyLike(/Static file\r?\n/);
    (await ua.getOk('/mount/full/does/not/exist')).statusIs(404);
  });

  await t.test('Full app (extended)', async () => {
    (await ua.getOk('/mount/full/extended')).statusIs(200).bodyIs('sharing works!');

    const logs = app.log.capture();
    (await ua.getOk('/mount/full/fails'))
      .typeIs('text/plain; charset=utf-8')
      .statusIs(500)
      .bodyLike(/Error: Intentional error/);
    logs.stop();
    t.match(logs.toString(), /\[error\].+Intentional error/);
  });

  await t.test('Full app (shared session)', async () => {
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: not logged in');
    (await ua.getOk('/mount/full/session/login/kraih')).statusIs(200).bodyIs('Login: kraih');
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: kraih');
    (await ua.getOk('/mount/full/session/logout')).statusIs(200).bodyIs('Logout: kraih');
  });

  await t.test('Full app (WebSocket)', async () => {
    await ua.websocketOk('/mount/full/echo.json', {json: true});
    await ua.sendOk({hello: 'world'});
    t.same(await ua.messageOk(), {hello: 'world!'});
    await ua.sendOk({hello: 'mojo'});
    t.same(await ua.messageOk(), {hello: 'mojo!'});
    await ua.closeOk(1000);
    await ua.closedOk(1000);
  });

  await t.test('Config app', async () => {
    (await ua.getOk('/config')).statusIs(200).bodyIs('My name is Bond. James Bond.');
    (await ua.getOk('/config/foo')).statusIs(404);
  });

  await ua.stop();
});
