const { Discord, Client, MessageEmbed } = require('discord.js');
const client = global.client = new Client({fetchAllMembers: true});
const ayarlar = require('./ayarlar.json');
const fs = require('fs');
const { S_IFREG } = require("constants");
const logs = require('discord-logs');
const mongoose = require('mongoose');
//mongoose.connect('', {useNewUrlParser: true, useUnifiedTopology: true});// Mongo connect bağlantısı.
const Database = require("./models/role.js");
client.on("ready", async () => {
  client.user.setPresence({ activity: { name: "Phentos ❤️ Rademoon" }, status: "online" });
  let botVoiceChannel = client.channels.cache.get(ayarlar.botVoiceChannelID);
  if (botVoiceChannel) botVoiceChannel.join().catch(err => console.error("Bot ses kanalına bağlanamadı!"));
});

client.on("message", async message => {
  if (message.author.bot || !message.guild || !message.content.toLowerCase().startsWith(ayarlar.botPrefix)) return;
  if (message.author.id !== ayarlar.botOwner && message.author.id !== message.guild.owner.id) return;
  let args = message.content.split(' ').slice(1);
  let command = message.content.split(' ')[0].slice(ayarlar.botPrefix.length);
  let embed = new MessageEmbed().setColor("#36393e").setAuthor(message.member.displayName, message.author.avatarURL({ dynamic: true, })).setTimestamp();
  
  // Eval
  if (command === "eval" && message.author.id === ayarlar.botOwner) {
    if (!args[0]) return message.channel.send(`Kod belirtilmedi`);
      let code = args.join(' ');
      function clean(text) {
      if (typeof text !== 'string') text = require('util').inspect(text, { depth: 0 })
      text = text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203))
      return text;
    };
    try { 
      var evaled = clean(await eval(code));
      if(evaled.match(new RegExp(`${client.token}`, 'g'))) evaled.replace(client.token, "Yasaklı komut");
      message.channel.send(`${evaled.replace(client.token, "Yasaklı komut")}`, {code: "js", split: true});
    } catch(err) { message.channel.send(err, {code: "js", split: true}) };
  };
// Güvenliye ekleme fonksiyonu
  if(command === "güvenli") {
    let hedef;
    let rol = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]) || message.guild.roles.cache.find(r => r.name === args.join(" "));
    let uye = message.mentions.users.first() || message.guild.members.cache.get(args[0]);
    if (rol) hedef = rol;
    if (uye) hedef = uye;
    let guvenliler = ayarlar.whitelist || [];
    if (!hedef) return message.channel.send(embed.setDescription(`Güvenli listeye eklemek/kaldırmak için bir hedef (rol/üye) belirtmelisin!`).addField("Güvenli Liste", guvenliler.length > 0 ? guvenliler.map(g => (message.guild.roles.cache.has(g.slice(1)) || message.guild.members.cache.has(g.slice(1))) ? (message.guild.roles.cache.get(g.slice(1)) || message.guild.members.cache.get(g.slice(1))) : g).join('\n') : "Bulunamadı!"));
    if (guvenliler.some(g => g.includes(hedef.id))) {
      guvenliler = guvenliler.filter(g => !g.includes(hedef.id));
      ayarlar.whitelist = guvenliler;
      fs.writeFile("./ayarlar.json", JSON.stringify(ayarlar), (err) => {
        if (err) console.log(err);
      });
      message.channel.send(embed.setDescription(`${hedef}, ${message.author} tarafından güvenli listeden kaldırıldı!`));
    } else {
      ayarlar.whitelist.push(`y${hedef.id}`);
      fs.writeFile("./ayarlar.json", JSON.stringify(ayarlar), (err) => {
        if (err) console.log(err);
      });
      message.channel.send(embed.setDescription(`${hedef}, ${message.author} tarafından güvenli listeye eklendi!`));
    };
  };
  // Koruma açma kapama
  if(command === "ayar")  {
    let korumalar = Object.keys(ayarlar).filter(k => k.includes('Guard'));
    if (!args[0] || !korumalar.some(k => k.includes(args[0]))) return message.channel.send(embed.setDescription(`Korumaları aktif etmek veya devre dışı bırakmak için **${ayarlar.botPrefix}ayar <koruma>** yazmanız yeterlidir! **Korumalar:** ${korumalar.map(k => `\`${k}\``).join(', ')}\n**Aktif Korumalar:** ${korumalar.filter(k => ayarlar[k]).map(k => `\`${k}\``).join(', ')}`));
    let koruma = korumalar.find(k => k.includes(args[0]));
    ayarlar[koruma] = !ayarlar[koruma];
    fs.writeFile("./ayarlar.json", JSON.stringify(ayarlar), (err) => {
      if (err) console.log(err);
    });
    message.channel.send(embed.setDescription(`**${koruma}** koruması, ${message.author} tarafından ${ayarlar[koruma] ? "aktif edildi" : "devre dışı bırakıldı"}!`));
  };
});

// Güvenli tanım fonksiyonu
function guvenli(kisiID) {
  let uye = client.guilds.cache.get(ayarlar.guildID).members.cache.get(kisiID);
  let guvenliler = ayarlar.whitelist || [];
  if (!uye || uye.id === client.user.id || uye.id === ayarlar.botOwner || uye.id === uye.guild.owner.id || guvenliler.some(g => uye.id === g.slice(1) || uye.roles.cache.has(g.slice(1)))) return true
  else return false;
};
//Cezaladırma fonksiyonu
const yetkiPermleri = ["ADMINISTRATOR", "MANAGE_ROLES", "MANAGE_CHANNELS", "MANAGE_GUILD", "BAN_MEMBERS", "KICK_MEMBERS", "MANAGE_NICKNAMES", "MANAGE_EMOJIS", "MANAGE_WEBHOOKS"];
function cezalandir(kisiID, tur) {
  let uye = client.guilds.cache.get(ayarlar.guildID).members.cache.get(kisiID);
  if (!uye) return;
  if (tur == "jail") return uye.roles.cache.has(ayarlar.boosterRole) ? uye.roles.set([ayarlar.boosterRole, ayarlar.jailRole]) : uye.roles.set([ayarlar.jailRole]);
  if (tur == "ban") return uye.ban({ reason: "Rademoon (Koruma)" }).catch();
};

// Kick koruması
client.on("guildMemberRemove", async member => {
  let entry = await member.guild.fetchAuditLogs({type: 'MEMBER_KICK'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.kickGuard) return;
  cezalandir(entry.executor.id, "ban");
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("#36393e").setTitle('Sağ Tık Kick Atıldı!').setDescription(`${member} **(${member.id})** üyesi, ${entry.executor} **(${entry.executor.id})** tarafından sunucudan sağ tık ile kicklendi! Kickleyen kişi jaile atıldı.`).setTimestamp()).catch(); } else { member.guild.owner.send(new MessageEmbed().setColor("#36393e").setTitle('Sağ Tık Kick Atıldı!').setDescription(`${member} **(${member.id})** üyesi, ${entry.executor} (${entry.executor.id}) tarafından sunucudan sağ tık ile kicklendi! Kickleyen kişi jaile atıldı.`).setTimestamp()).catch(err => {}); };
});
// Ban koruması
client.on("guildBanAdd", async (guild, user) => {
  let entry = await guild.fetchAuditLogs({type: 'MEMBER_BAN_ADD'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || guvenli(entry.executor.id) || !ayarlar.banGuard) return;
   cezalandir(entry.executor.id, "ban");
  guild.members.unban(user.id, "Sağ Tık İle Banlandığı İçin Geri Açıldı!").catch(console.error);
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("#36393e").setTitle('Sağ Tık Ban Atıldı!').setDescription(`${user} **(${user.id})** üyesi, ${entry.executor} **(${entry.executor.id})** tarafından sunucudan sağ tık ile banlandı! Banlayan kişi jaile atıldı.`).setTimestamp()).catch(); } else { guild.owner.send(new MessageEmbed().setColor("#36393e").setTitle('Sağ Tık Ban Atıldı!').setDescription(`${user} **(${user.id})** üyesi, ${entry.executor} **(${entry.executor.id})** tarafından sunucudan sağ tık ile banlandı! Banlayan kişi jaile atıldı.`).setTimestamp()).catch(err => {}); };
});
// Bot koruması
client.on("guildMemberAdd", async member => {
  let entry = await member.guild.fetchAuditLogs({type: 'BOT_ADD'}).then(audit => audit.entries.first());
  if (!member.user.bot || !entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.botGuard) return;
  cezalandir(entry.executor.id, "ban");
  cezalandir(member.id, "ban");
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("#36393e").setTitle('Sunucuya Bot Eklendi!').setDescription(`${member} **(${member.id})** botu, ${entry.executor} **(${entry.executor.id})** tarafından sunucuya eklendi! Ekleyen kişi ve bot banlandı.`).setTimestamp()).catch(); } else { member.guild.owner.send(new MessageEmbed().setColor("#36393e").setTitle('Sunucuya Bot Eklendi!').setDescription(`${member} **(${member.id})** botu, ${entry.executor} **(${entry.executor.id})** tarafından sunucuya eklendi! Ekleyen kişi ve bot banlandı.`).setTimestamp()).catch(err => {}); };
});
// GuildUpdate - Sunucu ayarları koruması
client.on("guildUpdate", async (oldGuild, newGuild) => {
  let entry = await newGuild.fetchAuditLogs({type: 'GUILD_UPDATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.serverGuard) return;
  cezalandir(entry.executor.id, "ban");
  if (newGuild.name !== oldGuild.name) newGuild.setName(oldGuild.name);
  if (newGuild.iconURL({dynamic: true, size: 2048}) !== oldGuild.iconURL({dynamic: true, size: 2048})) newGuild.setIcon(oldGuild.iconURL({dynamic: true, size: 2048}));
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("#36393e").setTitle('Sunucu Güncellendi!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından sunucu güncellendi! Güncelleyen kişi banlandı ve sunucu eski haline getirildi.`).setTimestamp()).catch(); } else { newGuild.owner.send(new MessageEmbed().setColor("#36393e").setTitle('Sunucu Güncellendi!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından sunucudan sunucu güncellendi! Güncelleyen kişi banlandı ve sunucu eski haline getirildi.`).setTimestamp()).catch(err => {}); };
});
// Kanal açtırmama
client.on("channelCreate", async channel => {
  let entry = await channel.guild.fetchAuditLogs({type: 'CHANNEL_CREATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.channelGuard) return;
  channel.delete({reason: "Rademoon (Kanal Koruma)"});
  cezalandir(entry.executor.id, "jail");
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("#36393e").setTitle('Kanal Oluşturuldu!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından kanal oluşturuldu! Oluşturan kişi jaile atıldı ve kanal silindi.`).setTimestamp()).catch(); } else { channel.guild.owner.send(new MessageEmbed().setColor("#36393e").setTitle('Kanal Oluşturuldu!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından kanal oluşturuldu! Oluşturan kişi jaile atıldı ve kanal silindi.`).setTimestamp()).catch(err => {}); };
});
// Kanal güncelleme koruması
client.on("channelUpdate", async (oldChannel, newChannel) => {
  let entry = await newChannel.guild.fetchAuditLogs({type: 'CHANNEL_UPDATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || !newChannel.guild.channels.cache.has(newChannel.id) || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.channelGuard) return;
  cezalandir(entry.executor.id, "jail");
  if (newChannel.type !== "category" && newChannel.parentID !== oldChannel.parentID) newChannel.setParent(oldChannel.parentID);
  if (newChannel.type === "category") {
    newChannel.edit({
      name: oldChannel.name,
    });
  } else if (newChannel.type === "text") {
    newChannel.edit({
      name: oldChannel.name,
      topic: oldChannel.topic,
      nsfw: oldChannel.nsfw,
      rateLimitPerUser: oldChannel.rateLimitPerUser
    });
  } else if (newChannel.type === "voice") {
    newChannel.edit({
      name: oldChannel.name,
      bitrate: oldChannel.bitrate,
      userLimit: oldChannel.userLimit,
    });
  };
  oldChannel.permissionOverwrites.forEach(perm => {
    let thisPermOverwrites = {};
    perm.allow.toArray().forEach(p => {
      thisPermOverwrites[p] = true;
    });
    perm.deny.toArray().forEach(p => {
      thisPermOverwrites[p] = false;
    });
    newChannel.createOverwrite(perm.id, thisPermOverwrites);
  });
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("#36393e").setTitle('Kanal Güncellendi!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından **${oldChannel.name}** kanalı güncellendi! Güncelleyen kişi jaile atıldı ve kanal eski haline getirildi.`).setTimestamp()).catch(); } else { newChannel.guild.owner.send(new MessageEmbed().setColor("#36393e").setTitle('Kanal Güncellendi!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından **${oldChannel.name}** kanalı güncellendi! Güncelleyen kişi jaile atıldı ve kanal eski haline getirildi.`).setTimestamp()).catch(err => {}); };
});
// Kanal sililince geri açma
client.on("channelDelete", async channel => {
  let entry = await channel.guild.fetchAuditLogs({type: 'CHANNEL_DELETE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.channelGuard) return;
  cezalandir(entry.executor.id, "ban");
  await channel.clone({ reason: "Rademoon (Kanal Koruma)" }).then(async kanal => {
    if (channel.parentID != null) await kanal.setParent(channel.parentID);
    await kanal.setPosition(channel.position);
    if (channel.type == "category") await channel.guild.channels.cache.filter(k => k.parentID == channel.id).forEach(x => x.setParent(kanal.id));
  });
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("#36393e").setTitle('Kanal Silindi!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından **${channel.name}** kanalı silindi! Silen kişi jaile atıldı ve kanal tekrar açıldı.`).setTimestamp()).catch(); } else { channel.guild.owner.send(new MessageEmbed().setColor("#36393e").setTitle('Kanal Silindi!').setDescription(`${entry.executor} **(${entry.executor.id})** tarafından **${channel.name}** kanalı silindi! Silen kişi jaile atıldı ve kanal tekrar açıldı.`).setTimestamp()).catch(err => {}); };
});
// Yt kapat fonksiyonu
function ytKapat(guildID) {
  let sunucu = client.guilds.cache.get(guildID);
  if (!sunucu) return;
  sunucu.roles.cache.filter(r => r.editable && (r.permissions.has("ADMINISTRATOR") || r.permissions.has("MANAGE_GUILD") || r.permissions.has("MANAGE_ROLES") || r.permissions.has("MANAGE_WEBHOOKS"))).forEach(async r => {
    await r.setPermissions(0);
  });
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("#36393e").setTitle('İzinler Kapatıldı!').setDescription(`Rollerin yetkileri kapatıldı!`).setTimestamp()).catch(); } else { channel.guild.owner.send(new MessageEmbed().setColor("#36393e").setTitle('İzinler Kapatıldı!').setDescription(`Rollerin yetkileri kapatıldı!`).setTimestamp()).catch(err => {}); };
};
client.login(ayarlar.botToken).then(c => console.log(`${client.user.tag} olarak giriş yapıldı!`)).catch(err => console.error("Bota giriş yapılırken başarısız olundu!"));
// Rol açtırmama
client.on("roleCreate", async role => {
  let entry = await role.guild.fetchAuditLogs({type: 'ROLE_CREATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.roleGuard) return;
  role.delete({ reason: "Rademoon (Rol Koruma)" });
  cezalandir(entry.executor.id, "jail");
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("#36393e").setTitle('Rol Oluşturuldu!').setDescription(`${entry.executor} (${entry.executor.id}) tarafından bir rol oluşturuldu! Oluşturan kişi jaile atıldı ve rol silindi.`).setTimestamp()).catch(); } else { role.guild.owner.send(new MessageEmbed().setColor("36393e").setTitle('Rol Oluşturuldu!').setDescription(`${entry.executor} (${entry.executor.id}) tarafından bir rol oluşturuldu! Oluşturan kişi jaile atıldı ve rol silindi.`).setTimestamp()).catch(err => {}); };
});
// Rol güncelleme koruması
client.on("roleUpdate", async (oldRole, newRole) => {
  let entry = await newRole.guild.fetchAuditLogs({type: 'ROLE_UPDATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || !newRole.guild.roles.cache.has(newRole.id) || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.roleGuard) return;
  cezalandir(entry.executor.id, "jail");
  if (yetkiPermleri.some(p => !oldRole.permissions.has(p) && newRole.permissions.has(p))) {
    newRole.setPermissions(oldRole.permissions);
    newRole.guild.roles.cache.filter(r => !r.managed && (r.permissions.has("ADMINISTRATOR") || r.permissions.has("MANAGE_ROLES") || r.permissions.has("MANAGE_GUILD"))).forEach(r => r.setPermissions(36818497));
  };
  newRole.edit({
    name: oldRole.name,
    color: oldRole.hexColor,
    hoist: oldRole.hoist,
    permissions: oldRole.permissions,
    mentionable: oldRole.mentionable
  });
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("#36393e").setTitle('Rol Güncellendi!').setDescription(`${entry.executor} (${entry.executor.id}) tarafından **${oldRole.name}** rolü güncellendi! Güncelleyen kişi banlandı ve rol eski haline getirildi.`).setTimestamp()).catch(); } else { newRole.guild.owner.send(new MessageEmbed().setColor("36393e").setTitle('Rol Güncellendi!').setDescription(`${entry.executor} (${entry.executor.id}) tarafından **${oldRole.name}** rolü güncellendi! Güncelleyen kişi jaile atıldı ve rol eski haline getirildi.`).setTimestamp()).catch(err => {}); };
});
// Rol sililince yapanı banlayıp rolüü tekrar dağıtan kısım
client.on("roleDelete", async role => {
  let entry = await role.guild.fetchAuditLogs({type: 'ROLE_DELETE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.roleGuard) return;
  cezalandir(entry.executor.id, "ban");
  let yeniRol = await role.guild.roles.create({
    data: {
      name: role.name,
      color: role.hexColor,
      hoist: role.hoist,
      position: role.position,
      permissions: role.permissions,
      mentionable: role.mentionable
    },
    reason: "Rademoon (Rol silindiği için tekrar oluşturuldu!)"
  });

  Database.findOne({guildID: role.guild.id, roleID: role.id}, async (err, roleData) => {
    if (!roleData) return;
    setTimeout(() => {
      let kanalPermVeri = roleData.channelOverwrites;
      if (kanalPermVeri) kanalPermVeri.forEach((perm, index) => {
        let kanal = role.guild.channels.cache.get(perm.id);
        if (!kanal) return;
        setTimeout(() => {
          let yeniKanalPermVeri = {};
          perm.allow.forEach(p => {
            yeniKanalPermVeri[p] = true;
          });
          perm.deny.forEach(p => {
            yeniKanalPermVeri[p] = false;
          });
          kanal.createOverwrite(yeniRol, yeniKanalPermVeri).catch(console.error);
        }, index*5000);
      });
    }, 5000);

    let roleMembers = roleData.members;
    roleMembers.forEach((member, index) => {
      let uye = role.guild.members.cache.get(member);
      if (!uye || uye.roles.cache.has(yeniRol.id)) return;
      setTimeout(() => {
        uye.roles.add(yeniRol.id).catch();
      }, index*3000);
    });
  });

  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("#36393e").setTitle('Rol Silindi!').setDescription(`${entry.executor} (${entry.executor.id}) tarafından **${role.name} (${role.id})** rolü silindi, silen kişi banlandı! Rol tekrar oluşturuldu, üyelerine dağıtılmaya ve izinleri kanallara eklenmeye başlanıyor.`).setTimestamp()).catch(); } else { role.guild.owner.send(new Discord.MessageEmbed().setColor("f5f5f5").setTitle('Rol Silindi!').setDescription(`${entry.executor} (${entry.executor.id}) tarafından **${role.name} (${role.id})** rolü silindi, silen kişi banlandı! Rol tekrar oluşturuldu, üyelerine dağıtılmaya ve izinleri kanallara eklenmeye başlanıyor.`).setTimestamp()).catch(err => {}); };
});

// Backup alma fonksiyonu
function setRoleBackup() {
  let guild = client.guilds.cache.get(ayarlar.guildID);
  if (guild) {
    guild.roles.cache.filter(r => r.name !== "@everyone" && !r.managed).forEach(role => {
      let roleChannelOverwrites = [];
      guild.channels.cache.filter(c => c.permissionOverwrites.has(role.id)).forEach(c => {
        let channelPerm = c.permissionOverwrites.get(role.id);
        let pushlanacak = { id: c.id, allow: channelPerm.allow.toArray(), deny: channelPerm.deny.toArray() };
        roleChannelOverwrites.push(pushlanacak);
      });

      Database.findOne({guildID: ayarlar.guildID, roleID: role.id}, async (err, savedRole) => {
        if (!savedRole) {
          let newRoleSchema = new Database({
            _id: new mongoose.Types.ObjectId(),
            guildID: ayarlar.guildID,
            roleID: role.id,
            name: role.name,
            color: role.hexColor,
            hoist: role.hoist,
            position: role.position,
            permissions: role.permissions,
            mentionable: role.mentionable,
            time: Date.now(),
            members: role.members.map(m => m.id),
            channelOverwrites: roleChannelOverwrites
          });
          newRoleSchema.save();
        } else {
          savedRole.name = role.name;
          savedRole.color = role.hexColor;
          savedRole.hoist = role.hoist;
          savedRole.position = role.position;
          savedRole.permissions = role.permissions;
          savedRole.mentionable = role.mentionable;
          savedRole.time = Date.now();
          savedRole.members = role.members.map(m => m.id);
          savedRole.channelOverwrites = roleChannelOverwrites;
          savedRole.save();
        };
      });
    });

    Database.find({guildID: ayarlar.guildID}).sort().exec((err, roles) => {
      roles.filter(r => !guild.roles.cache.has(r.roleID) && Date.now()-r.time > 1000*60*60*24*3).forEach(r => {//1 saatte bir alır. Süreyi değiştirebilirsiinz.
        Database.findOneAndDelete({roleID: r.roleID});
      });
    });
    console.log(`Rol veri tabanı düzenlendi!`);
  };
};