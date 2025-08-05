import { bot } from 'bot';
import i18next, { t } from 'i18next';
import db from 'config/db/databaseServise';
import keyboard from 'bot/keyboard';
import { getUserLanguage } from 'config/lib/helpers/cacheLaguage';
import { notRegistrationMessage } from 'config/lib/helpers/notRegistrationMessage';
import { sendMessage } from 'config/lib/helpers/sendMessage';

export default (): void => {
  const regex = /\/start(?: (.+))?/;
  bot.onText(regex, (ctx, match) => {
    void (async () => {
      const userId = ctx.chat.id;
      const payload = match?.[1] ?? null;
      const adminId = Number(process.env.ADMIN);
      let referrerId: number | undefined;
      if (payload?.startsWith('ref')) {
        const parsed = Number(payload.slice(3));
        if (!isNaN(parsed) && parsed === adminId) {
          referrerId = parsed;
        }
      }
      await i18next.changeLanguage(await getUserLanguage(userId));
      const isRegistered = await db.getUser(userId);
      if (!isRegistered && referrerId === undefined) return;
      await sendMessage(userId, t('Приветствие'), keyboard.Main());
      if (isRegistered) {
        await sendMessage(
          userId,
          t('Сообщение об отслеживании'),
          keyboard.Observe(),
        );
      } else await notRegistrationMessage(userId, referrerId);
    })();
  });
};
