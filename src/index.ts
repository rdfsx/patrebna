import 'dotenv/config';
import { fork } from 'child_process';
import { t } from 'i18next';
import db from 'config/db/databaseServise';
import { scheduleJob } from 'node-schedule';
import {
  type IAd,
  type IParserData,
  type IProcessMessage,
  UserActions,
} from 'config/types';
import { getUserIds } from 'config/lib/helpers/getUserIds';
import { sendMessage } from 'config/lib/helpers/sendMessage';
import { getUser } from 'config/lib/helpers/getUser';

import keyboard from 'bot/keyboard';
import path from 'path';
import { notificationOfNewAds } from 'config/lib/helpers/notificationOfNewAds';

void (async () => {
  void scheduleParsing('*/5 * * * *', () => true);

  scheduleJob('0 0 * * *', async () => {
    await db.clearExpiredAdReferences();
  });
  scheduleJob('0 0 * * 0', async () => {
    await handleInactiveUsers(UserActions.REMOVE);
  });

  scheduleJob('12 */8 * * *', async () => {
    await handleInactiveUsers(UserActions.NOTIFACTION);
  });
})();

const userActions = {
  remove: async (id: number) => {
    await db.removeUser(id);
  },
  notification: async (id: number) => {
    await sendMessage(
      id,
      t('Сообщение для неактивных пользователей'),
      keyboard.Observe(),
    );
  },
};

async function handleInactiveUsers(action: UserActions): Promise<void> {
  const usersFromDatabase = await db.getUsersForParse();
  const inactiveUserIds = usersFromDatabase
    .filter((user) => !user.parser?.kufar?.dataParser)
    .map((user) => user.id);

  if (inactiveUserIds.length) {
    for (const id of inactiveUserIds) {
      await userActions[action](id);
    }
  }
}

async function scheduleParsing(
  cronTime: string,
  filterFn: (user: { userId: number }) => boolean,
): Promise<void> {
  scheduleJob(cronTime, async () => {
    const userIds = await getUserIds();

    const usersWithStatus = await Promise.all(
      userIds.map(async (userId) => {
        const user = await getUser(userId);
        return { userId, ...user };
      }),
    );

    const filteredUsers = usersWithStatus.filter(filterFn);
    const child = fork(
      path.resolve(__dirname, 'parsers/kufar/tasks/parseKufar.ts'),
      {
        execArgv: ['-r', 'ts-node/register'],
      },
    );
    child.send({ payload: filteredUsers });
    child.on('message', (message: IProcessMessage) => {
      void (async () => {
        const type = message?.type;

        if (type === 'newAds' && message?.payload) {
          const { user, newAds } = message.payload as {
            user: IParserData & { userId: number };
            newAds: IAd[];
          };
          await notificationOfNewAds(user, newAds);
        }

        if (type === 'done') child.disconnect();
      })();
    });
    child.on('error', (err) => {
      console.error('Ошибка запуска воркера:', err);
    });
  });
}
