// bot.js
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const PREFIX = '!obf';

// Core obfuscation functions (port from your Lua)
function bxor(a, b) {
    let r = 0, p = 1;
    while (a > 0 || b > 0) {
        let aa = a % 2, bb = b % 2;
        if (aa !== bb) r += p;
        a = Math.floor(a / 2);
        b = Math.floor(b / 2);
        p *= 2;
    }
    return r;
}

function randomKey() {
    return Math.floor(Math.random() * (240 - 80 + 1)) + 80;
}

function encode(str, k1, k2) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
        out.push(bxor(bxor(str.charCodeAt(i), k1), k2));
    }
    return out.join(',');
}

function buildLoader(encoded, k1, k2) {
    return `-- Obfuscated by: Sttar Albiola
-- Discord: https://discord.gg/KcgSrEvYFP
local data={}
for v in string.gmatch("${encoded}","([^,]+)") do table.insert(data,tonumber(v)) end
local function _bx(a,b) local r,p=0,1 while a>0 or b>0 do local aa,bb=a%%2,b%%2 if aa~=bb then r=r+p end a,b,p=math.floor(a/2),math.floor(b/2),p*2 end return r end
local k1,k2=${k1},${k2} local res={}
for i=1,#data do res[i]=string.char(_bx(_bx(data[i],k2),k1)) end
local f,e=loadstring(table.concat(res)) if f then f() else error(e) end`;
}

client.once('ready', () => {
    console.log(`🤖 ${client.user.tag} is online! Obfuscating...`);
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;
    
    const args = message.content.slice(PREFIX.length).trim();
    if (!args) {
        return message.reply('❌ **Usage:** `!obf <your lua code>`');
    }

    if (args.length > 1900) {
        return message.reply('❌ **Code too long!** Max 1900 characters.');
    }

    const embed = new EmbedBuilder()
        .setTitle('🔐 **Obfuscating Code...**')
        .setDescription('`Processing your Lua code...`')
        .setColor('#00ff88');

    const msg = await message.reply({ embeds: [embed] });

    try {
        const k1 = randomKey();
        const k2 = randomKey();
        const encoded = encode(args, k1, k2);
        const obfuscated = buildLoader(encoded, k1, k2);

        // Save to file for Discord attachment (if too long)
        let codeDisplay = obfuscated;
        if (obfuscated.length > 1000) {
            const filename = `obf_${message.author.id}_${Date.now()}.lua`;
            fs.writeFileSync(filename, obfuscated);
            const attachment = new AttachmentBuilder(filename, { name: filename });
            
            embed
                .setTitle('✅ **Obfuscated Successfully!**')
                .setDescription('**Code saved as attachment** (too long for embed)')
                .setColor('#00ff00')
                .addFields({ name: '📋 Preview', value: ````lua
${obfuscated.slice(0, 950)}...
````, inline: false })
                .setFooter({ text: `Sttar Albiola's Obfuscator | ${message.author.username}` });
            
            await msg.edit({ embeds: [embed], files: [attachment] });
            fs.unlinkSync(filename); // Clean up
        } else {
            embed
                .setTitle('✅ **Obfuscated Successfully!**')
                .setDescription('**Copy the code below:**')
                .setColor('#00ff00')
                .addFields({ 
                    name: '📋 Obfuscated Code', 
                    value: ````lua
${obfuscated}
```` 
                })
                .setFooter({ text: `Sttar Albiola's Obfuscator | ${message.author.username}`, iconURL: message.author.displayAvatarURL() });
            
            await msg.edit({ embeds: [embed] });
        }

    } catch (error) {
        console.error(error);
        embed.setTitle('❌ **Obfuscation Failed**')
            .setDescription('**Error:** Could not process code')
            .setColor('#ff4444');
        await msg.edit({ embeds: [embed] });
    }
});

client.login(process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN');
