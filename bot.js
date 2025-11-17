const TelegramBot = require('node-telegram-bot-api');
const Database = require('better-sqlite3');

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const PAYMENT_TOKEN = process.env.PAYMENT_TOKEN;

// Check if BOT_TOKEN is provided
if (!BOT_TOKEN) {
  console.error('❌ ERROR: BOT_TOKEN is not set in environment variables!');
  console.error('Please add BOT_TOKEN in Render Environment Variables.');
  process.exit(1);
}

if (!PAYMENT_TOKEN) {
  console.error('❌ ERROR: PAYMENT_TOKEN is not set in environment variables!');
  console.error('Please add PAYMENT_TOKEN (Ammer Pay token) in Render Environment Variables.');
  process.exit(1);
}

const FREE_CHANNEL = process.env.FREE_CHANNEL || '@yallabets';
const VIP_CHANNEL_ID = process.env.VIP_CHANNEL_ID || '-1003495823265';
const SUBSCRIPTION_PRICE = parseInt(process.env.SUBSCRIPTION_PRICE) || 20;
const SUBSCRIPTION_DAYS = parseInt(process.env.SUBSCRIPTION_DAYS) || 30;

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Initialize database
const db = new Database('users.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    subscription_end INTEGER,
    created_at INTEGER
  )
`);

// Translations
const messages = {
  ar: {
    welcome: `🎯 مرحباً بك في YallaBets VIP!

💎 اشترك الآن واحصل على:
• 10-30 توقع أسبوعياً
• تحليلات مفصلة
• نسبة نجاح 85%+
• تحديثات مباشرة

💰 السعر: $${SUBSCRIPTION_PRICE}/شهر

الأوامر:
/subscribe - اشترك في VIP
/status - حالة الاشتراك
/cancel - إلغاء الاشتراك
/help - المساعدة

🆓 القناة المجانية: ${FREE_CHANNEL}
🌐 الموقع: yallabets.com`,
    
    subscribe: `💎 اشترك في YallaBets VIP

احصل على 10-30 توقع أسبوعياً!

💰 السعر: ${SUBSCRIPTION_PRICE} Stars ($${SUBSCRIPTION_PRICE})
⏰ المدة: ${SUBSCRIPTION_DAYS} يوم

اضغط الزر بالأسفل للاشتراك!`,
    
    already_subscribed: '✅ أنت مشترك بالفعل في VIP!\n\nاستخدم /status لمعرفة تاريخ انتهاء الاشتراك.',
    payment_success: '🎉 تم الاشتراك بنجاح!\n\nتم إضافتك للقناة VIP.\nاستمتع بالتوقعات الحصرية!',
    not_subscribed: '❌ أنت غير مشترك في VIP.\n\nاستخدم /subscribe للاشتراك!',
    subscription_cancelled: '✅ تم إلغاء الاشتراك.\n\nشكراً لاستخدامك YallaBets!',
  },
  en: {
    welcome: `🎯 Welcome to YallaBets VIP!

💎 Subscribe now and get:
• 10-30 picks per week
• Detailed analysis
• 85%+ win rate
• Live updates

💰 Price: $${SUBSCRIPTION_PRICE}/month

Commands:
/subscribe - Subscribe to VIP
/status - Check subscription
/cancel - Cancel subscription
/help - Show help

🆓 Free Channel: ${FREE_CHANNEL}
🌐 Website: yallabets.com`,
    
    subscribe: `💎 Subscribe to YallaBets VIP

Get 10-30 picks per week!

💰 Price: ${SUBSCRIPTION_PRICE} Stars ($${SUBSCRIPTION_PRICE})
⏰ Duration: ${SUBSCRIPTION_DAYS} days

Click the button below to subscribe!`,
    
    already_subscribed: '✅ You are already subscribed to VIP!\n\nUse /status to check your subscription.',
    payment_success: '🎉 Subscription successful!\n\nYou have been added to the VIP channel.\nEnjoy exclusive predictions!',
    not_subscribed: '❌ You are not subscribed to VIP.\n\nUse /subscribe to get started!',
    subscription_cancelled: '✅ Subscription cancelled.\n\nThank you for using YallaBets!',
  }
};

// Helper functions
function getLang(msg) {
  return msg.from.language_code === 'ar' ? 'ar' : 'en';
}

function isSubscribed(userId) {
  const user = db.prepare('SELECT subscription_end FROM users WHERE user_id = ?').get(userId);
  if (!user) return false;
  return user.subscription_end > Date.now();
}

function addSubscription(userId, username, firstName) {
  const subscriptionEnd = Date.now() + (SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
  db.prepare(`
    INSERT OR REPLACE INTO users (user_id, username, first_name, subscription_end, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, username, firstName, subscriptionEnd, Date.now());
}

function removeSubscription(userId) {
  db.prepare('UPDATE users SET subscription_end = 0 WHERE user_id = ?').run(userId);
}

// Commands
bot.onText(/\/start/, (msg) => {
  const lang = getLang(msg);
  bot.sendMessage(msg.chat.id, messages[lang].welcome);
});

bot.onText(/\/help/, (msg) => {
  const lang = getLang(msg);
  bot.sendMessage(msg.chat.id, messages[lang].welcome);
});

bot.onText(/\/subscribe/, async (msg) => {
  const lang = getLang(msg);
  const userId = msg.from.id;
  
  if (isSubscribed(userId)) {
    return bot.sendMessage(msg.chat.id, messages[lang].already_subscribed);
  }
  
  // Send invoice with Ammer Pay
  await bot.sendInvoice(
    msg.chat.id,
    'YallaBets VIP Subscription',
    `Get 10-30 expert picks per week for ${SUBSCRIPTION_DAYS} days`,
    `vip_subscription_${userId}_${Date.now()}`,
    PAYMENT_TOKEN,
    'USD',
    [{ label: 'VIP Subscription', amount: SUBSCRIPTION_PRICE * 100 }],
    {
      need_name: false,
      need_phone_number: false,
      need_email: false,
      need_shipping_address: false,
      is_flexible: false,
    }
  );
});

bot.onText(/\/status/, (msg) => {
  const lang = getLang(msg);
  const userId = msg.from.id;
  
  if (!isSubscribed(userId)) {
    return bot.sendMessage(msg.chat.id, messages[lang].not_subscribed);
  }
  
  const user = db.prepare('SELECT subscription_end FROM users WHERE user_id = ?').get(userId);
  const daysLeft = Math.ceil((user.subscription_end - Date.now()) / (24 * 60 * 60 * 1000));
  
  const statusMsg = lang === 'ar' 
    ? `✅ اشتراكك نشط!\n\n⏰ الأيام المتبقية: ${daysLeft} يوم`
    : `✅ Your subscription is active!\n\n⏰ Days remaining: ${daysLeft} days`;
  
  bot.sendMessage(msg.chat.id, statusMsg);
});

bot.onText(/\/cancel/, (msg) => {
  const lang = getLang(msg);
  const userId = msg.from.id;
  
  if (!isSubscribed(userId)) {
    return bot.sendMessage(msg.chat.id, messages[lang].not_subscribed);
  }
  
  removeSubscription(userId);
  
  // Remove from VIP channel
  bot.banChatMember(VIP_CHANNEL_ID, userId)
    .then(() => bot.unbanChatMember(VIP_CHANNEL_ID, userId))
    .catch(console.error);
  
  bot.sendMessage(msg.chat.id, messages[lang].subscription_cancelled);
});

// Handle successful payment
bot.on('pre_checkout_query', (query) => {
  bot.answerPreCheckoutQuery(query.id, true);
});

bot.on('successful_payment', async (msg) => {
  const lang = getLang(msg);
  const userId = msg.from.id;
  const username = msg.from.username;
  const firstName = msg.from.first_name;
  
  // Add subscription
  addSubscription(userId, username, firstName);
  
  // Add to VIP channel
  try {
    await bot.approveChatJoinRequest(VIP_CHANNEL_ID, userId);
  } catch (error) {
    console.log('Could not approve join request, trying to send invite link...');
    // If join request doesn't work, send invite link
    const inviteLink = await bot.createChatInviteLink(VIP_CHANNEL_ID, {
      member_limit: 1,
      expire_date: Math.floor(Date.now() / 1000) + 86400,
    });
    
    bot.sendMessage(userId, `${messages[lang].payment_success}\n\n🔗 Join VIP Channel: ${inviteLink.invite_link}`);
    return;
  }
  
  bot.sendMessage(msg.chat.id, messages[lang].payment_success);
});

// Check expired subscriptions every hour
setInterval(() => {
  const expiredUsers = db.prepare('SELECT user_id FROM users WHERE subscription_end > 0 AND subscription_end < ?').all(Date.now());
  
  expiredUsers.forEach(user => {
    removeSubscription(user.user_id);
    bot.banChatMember(VIP_CHANNEL_ID, user.user_id)
      .then(() => bot.unbanChatMember(VIP_CHANNEL_ID, user.user_id))
      .catch(console.error);
  });
}, 60 * 60 * 1000);

console.log('🤖 YallaBets VIP Bot started successfully!');
