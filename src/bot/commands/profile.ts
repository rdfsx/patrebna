/* eslint-disable @typescript-eslint/no-non-null-assertion */
import i18next, { t } from 'i18next';
import { bot } from 'bot';
import db from 'config/db/databaseServise';
import keyboard from 'bot/keyboard';
import { getUserLanguage } from 'config/lib/helpers/cacheLaguage';
import { notRegistrationMessage } from 'config/lib/helpers/notRegistrationMessage';
import { sendMessage } from 'config/lib/helpers/sendMessage';

export default (): void => {
  const regex = /Профиль|Профіль/;
  bot.onText(regex, (ctx) => {
    void (async () => {
      const userId = ctx.chat.id;
      await i18next.changeLanguage(await getUserLanguage(userId));
      const isRegistered = await db.getUser(userId);
      if (isRegistered) {
        const profile = await db.getProfile(userId);
        const dataProfile = [
          `${t('Сообщение для профиля')}`,
          '',
          `<b>${t('ФИО')}</b>: ${profile?.last_name ?? ''} ${profile?.first_name ?? ''}`,
          `${profile?.username ? `<b>${t('Псевдоним')}</b>: ${profile?.username ?? ''}` : ''}`,
          `<b>${t('Подписка на канал')}</b>: ${profile?.subscribeToChannel ? '☑️' : '✖️'}`,
          `<b>${t('Количество рефералов')}</b>: ${profile?.referrals.length}`,
        ].join('\n');
        await sendMessage(userId, dataProfile, await keyboard.Profile());
      } else await notRegistrationMessage(userId);
    })();
  });
};
