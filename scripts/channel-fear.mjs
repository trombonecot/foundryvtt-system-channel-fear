import { ChannelFearActor } from './documents/actor.mjs';
import { ChannelFearItem } from './documents/item.mjs';
import { ChannelFearActorSheet } from './sheets/actor-sheet.mjs';
import { ChannelFearItemSheet } from './sheets/item-sheet.mjs';
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { CF } from './helpers/config.mjs';
import * as Chat from './chat.mjs';

Hooks.once('init', async function () {
  game.channelfear = {
    ChannelFearActor,
    ChannelFearItem,
    rollItem,
  };

  CONFIG.CF = CF;

  CONFIG.Actor.documentClass = ChannelFearActor;
  CONFIG.Item.documentClass = ChannelFearItem;

  CONFIG.canvasTextStyle.fontFamily = 'MuseoSlab';
  CONFIG.fontFamilies.push('MuseoSlab', 'ChalkDuster');
  CONFIG.defaultFontFamily = 'MuseoSlab';

  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('channelfear', ChannelFearActorSheet, { makeDefault: true });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('channelfear', ChannelFearItemSheet, { makeDefault: true });

  if (typeof Babele !== 'undefined') {
    Babele.get().setSystemTranslationsDir('packs/translations');
  }

  return preloadHandlebarsTemplates();
});

Handlebars.registerHelper('image', fileName => `systems/channel-fear/images/${fileName}`);

Handlebars.registerHelper('markSpecialtyActive', (askedLevel, currentLevel) => currentLevel >= askedLevel);

Hooks.once('ready', async function () {
  const logo = document.getElementById('logo');
  logo.src = '/systems/channel-fear/images/logo.webp';
  logo.removeAttribute('height');
  logo.classList.add('loaded');

  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));
});

Hooks.on('renderPause', (app, html, options) => {
  if (options.paused) {
    html.find('img')[0].src = 'systems/channel-fear/images/logo.webp';
  }
});

Hooks.on('renderChatMessage', (app, html, data) => {
  Chat.addChatListeners(html);
  Chat.hideActionsButtons(html);
});

async function createItemMacro(data, slot) {
  if (data.type !== 'Item') {
    return;
  }

  if (!('data' in data)) {
    return ui.notifications.warn(game.i18n.localize('CF.Warnings.MacroOnlyForOwnedItem'));
  }

  const item = data.data;

  // Create the macro command
  const command = `game.channelfear.rollItem("${item._id}");`;
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'channelfear.itemMacro': true },
    });
  }

  game.user.assignHotbarMacro(macro, slot);

  return false;
}

function rollItem(itemId) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) {
    actor = game.actors.tokens[speaker.token];
  }

  if (!actor) {
    actor = game.actors.get(speaker.actor);
  }

  const item = actor ? actor.items.find(i => i.id === itemId) : null;
  if (!item) {
    return ui.notifications.warn(game.i18n.format('CF.Warnings.MacroItemNotFound', { id: itemId }));
  }

  return item.roll();
}