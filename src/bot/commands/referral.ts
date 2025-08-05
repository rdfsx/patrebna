import { bot } from 'bot';
import { sendMessage } from 'config/lib/helpers/sendMessage';

export default (): void => {
  const regex = /\/createreferral/;
  bot.onText(regex, (ctx) => {
    void (async () => {
      const userId = ctx.chat.id;
      const adminId = Number(process.env.ADMIN);
      if (userId !== adminId) return;
      const me = await bot.getMe();
      const link = `https://t.me/${me.username}?start=ref${adminId}`;
      await sendMessage(userId, link);
    })();
  });
};
