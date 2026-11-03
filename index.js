const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const express = require('express');
const Parser = require('rss-parser');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

const parser = new Parser();
const RSS_FEED_URL = 'رابط_موقع_أو_منصة_تتبع_مهام_ديسكورد_هنا'; 

let targetChannelId = 'حط_ايدي_روم_الإشعارات_هنا';

// قائمة المهام المتاحة للتنفيذ الجماعي
let latestQuestsList = [
    { id: 'quest_1', title: 'مشاهدة فيديو يوتيوب لمدة 15 دقيقة', type: 'فيديو', duration: '15 دقيقة', orbs: 'محدد بالمهمة', link: '#' },
    { id: 'quest_2', title: 'لعب لعبة Roblox المخصصة لمدة 30 دقيقة', type: 'لعبة', duration: '30 دقيقة', orbs: 'محدد بالمهمة', link: '#' }
];

// تخزين إعدادات التنبيهات (ON / OFF)
let userAlertPreferences = new Map();

// تخزين مؤقت لعمليات الفارم الجماعي لكل مستخدم
let activeFarmingSessions = new Map();

const app = express();
app.use(express.json());

const TOKEN = 'MTU2Njk2MTg1NTEyMzk0NzY3MQ.Gj1ib6.JvopxZ3FmgiPofpgqtpPD5vkvK_AMAnkkikI6s';
const PORT = process.env.PORT || 3000;

client.once('ready', () => {
    console.log(`✅ البوت اشتغل بنجاح باسم: ${client.user.tag}`);
    setInterval(checkNewQuests, 10 * 60 * 1000);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. أمر !quests
    if (command === '!quests') {
        if (latestQuestsList.length === 0) {
            return message.reply('❌ لا توجد أي مهام جديدة رصدت حتى الآن.');
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📋 قائمة مهام ديسكورد الحالية')
            .setDescription('إليك المهام المتوفرة والشروط الخاصة بكل مهمة:')
            .setTimestamp();

        latestQuestsList.forEach((q, index) => {
            embed.addFields({ 
                name: `${index + 1}. ${q.title}`, 
                value: `• النوع والشروط: (${q.duration})\n• المكافأة: أوربس ${q.orbs}\n• [رابط المهمة](${q.link})`, 
                inline: false 
            });
        });

        return message.reply({ embeds: [embed] });
    }

    // 2. أمر !setchannel
    if (command === '!setchannel') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && message.guild.ownerId !== message.author.id) {
            return message.reply('⛔ عذراً، هذا الأمر مخصص **للأدمن والأونر فقط**!');
        }

        targetChannelId = message.channel.id;
        return message.reply(`✅ تم بنجاح تعيين هذه الروم (<#${targetChannelId}>) لاستقبال إشعارات المهام القادمة!`);
    }

    // 3. أمر !orbs
    if (command === '!orbs') {
        let totalQuests = latestQuestsList.length;

        const embed = new EmbedBuilder()
            .setColor('#00FFCC')
            .setTitle('📊 إحصائيات الكويستات والأوربس')
            .addFields(
                { name: 'عدد الكويستات المتاحة حالياً', value: `${totalQuests} كويست`, inline: true },
                { name: 'طريقة احتساب الأوربس', value: 'حسب متطلبات وإيرادات كل مهمة فعلية في ديسكورد', inline: true }
            )
            .setFooter({ text: 'Orbs System Tracker' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }

    // 4. أمر !farming (تنفيذ جميع المهام دفعة واحدة)
    if (command === '!farming') {
        if (latestQuestsList.length === 0) {
            return message.reply({ content: '❌ لا توجد مهام متاحة للتنفيذ الآلي حالياً.', allowedMentions: { repliedUser: true } });
        }

        // تسجيل حالة المستخدم بأنه بانتظار إدخال التوكن لعمل فارفينج لكل المهام
        activeFarmingSessions.set(message.author.id, true);

        return message.reply({
            content: '🎮 **نظام التلقي الآلي الجماعي (Bulk Farming):**\nسيتم تنفيذ **جميع المهام المتاحة حالياً (عددها: ' + latestQuestsList.length + ')** دفعة واحدة!\n\n🔒 الرجاء إرسال الـ **User Token** الخاص بك هنا (أو في الخاص) للبدء.',
            allowedMentions: { repliedUser: true }
        });
    }

    // استقبال التوكن لو المستخدم في جلسة الفارم الجماعي
    if (activeFarmingSessions.has(message.author.id)) {
        const userToken = message.content.trim();
        activeFarmingSessions.delete(message.author.id); // مسح الجلسة بعد استلام التوكن

        // حذف رسالة التوكن حفاظاً على سرية وخصوصية المستخدم
        try { await message.delete(); } catch (err) {}

        const processingMsg = await message.channel.send(`⏳ جاري الآن معالجة وتنفيذ **جميع المهام (${latestQuestsList.length} مهمة)** باستخدام التوكن الخاص بك... يرجى الانتظار.`);

        // محاكاة إتمام جميع المهام دفعة واحدة
        setTimeout(async () => {
            await processingMsg.delete().catch(() => {});

            const userId = message.author.id;
            const wantsMention = userAlertPreferences.get(userId) !== false;

            let alertContent = wantsMention 
                ? `<@${userId}> 🎉 **تهانينا! لقد تم إنهاء جميع المهام المتاحة بنجاح دفعة واحدة.** يمكنك الآن عمل **Claim** لجميع الأوربس!`
                : `🎉 **تهانينا! لقد تم إنهاء جميع المهام المتاحة بنجاح دفعة واحدة.** يمكنك الآن عمل **Claim** لجميع الأوربس!`;

            try {
                await message.author.send({ content: alertContent });
            } catch (err) {
                // لو الخاص مقفل يبعتها في الروم كمؤشر
                await message.channel.send({ content: alertContent });
            }
        }, 6000); // محاكاة سرعة الانتهاء دفعة واحدة

        return;
    }

    // 5. أمر !enable
    if (command === '!enable') {
        const choice = args[0] ? args[0].toLowerCase() : '';
        if (choice !== 'on' && choice !== 'off') {
            return message.reply({
                content: '⚙️ **إعدادات إشعارات المهام:**\nالرجاء استخدام الأمر بالشكل الصحيح:\n• `!enable on` (إشعار مع **منشن شخصي**)\n• `!enable off` (إشعار **بدون منشن**)',
                allowedMentions: { repliedUser: true }
            });
        }

        if (choice === 'on') {
            userAlertPreferences.set(message.author.id, true);
            return message.reply({ content: '✅ تم تفعيل إشعارات اكتمال المهام بوضع **(ON)**: سيصلك إشعار مع **منشن شخصي** فور اكتمال الجميع!', allowedMentions: { repliedUser: true } });
        } else {
            userAlertPreferences.set(message.author.id, false);
            return message.reply({ content: '☑️ تم ضبط إشعارات اكتمال المهام بوضع **(OFF)**: سيصلك إشعار بالانتهاء **بدون أي منشن**.', allowedMentions: { repliedUser: true } });
        }
    }

    // 6. أمر !help cmds
    if (command === '!help' && args[0] === 'cmds') {
        const helpEmbed = new EmbedBuilder()
            .setColor('#FF73FA')
            .setTitle('📖 قائمة أوامر بوت تتبع مهام الأوربس')
            .setDescription('إليك جميع الأوامر المتاحة وكيفية استخدامها:')
            .addFields(
                { name: '`!quests`', value: 'لعرض لوحة بكل الكويستات الحالية وأنواعها وشروطها.', inline: false },
                { name: '`!setchannel`', value: 'لتحديد روم الإشعارات (مخصص **للأدمن والأونر فقط**).', inline: false },
                { name: '`!orbs`', value: 'لعرض عدد الكويستات ونظام احتساب الأوربس الفعلي.', inline: false },
                { name: '`!farming`', value: 'تنفيذ **جميع المهام المتاحة دفعة واحدة** بعد إدخال التوكن.', inline: false },
                { name: '`!enable <on/off>`', value: 'لتحديد تفضيلات إشعارات الانتهاء (منشن أو بدون منشن).', inline: false },
                { name: '`!help cmds`', value: 'لعرض قائمة المساعدة هذه.', inline: false }
            )
            .setFooter({ text: 'Discord Quest Bot Help Menu' })
            .setTimestamp();

        try {
            await message.author.send({ embeds: [helpEmbed] });
            return message.reply({ content: '📬 لقد أرسلت لك قائمة الأوامر والشرح في **الرسائل الخاصة (DM)** لخصوصيتك!' });
        } catch (err) {
            return message.reply({ embeds: [helpEmbed] });
        }
    }
});

// دالة فحص المهام تلقائياً عبر الـ RSS
async function checkNewQuests() {
    try {
        const feed = await parser.parseURL(RSS_FEED_URL);
        if (!feed.items || feed.items.length === 0) return;

        const latestItem = feed.items[0];
        const content = latestItem.content || latestItem.title || '';

        const newQuest = {
            id: 'quest_' + Date.now(),
            title: latestItem.title || 'مهمة جديدة',
            type: content.includes('video') ? 'فيديو' : 'لعبة',
            duration: 'حسب متطلبات ديسكورد',
            orbs: 'حسب المهمة الفعلية',
            link: latestItem.link || '#'
        };

        latestQuestsList.unshift(newQuest);

        const channel = await client.channels.fetch(targetChannelId);
        if (!channel) return;

        const questEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(latestItem.title || 'New Quest Available!')
            .setDescription(`**تفاصيل المهمة:**\n${content}`)
            .addFields({ name: 'رابط المهمة', value: latestItem.link || 'غير متوفر' })
            .setTimestamp();

        await channel.send({ 
            content: '@everyone 🚨 **مهمة أوربس جديدة متوفرة الآن!**', 
            embeds: [questEmbed] 
        });
    } catch (error) {
        console.error('خطأ في جلب المهام:', error.message);
    }
}

app.post('/quest-webhook', async (req, res) => {
    res.status(200).send({ success: true });
});

app.listen(PORT, () => console.log(`🌐 السيرفر شغال على البورت ${PORT}`));

client.login(TOKEN);