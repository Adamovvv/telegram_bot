const TelegramBot = require('node-telegram-bot-api');
const products = require('./products');
const fetch = require('node-fetch');

const token = '6692534585:AAFzHaJKqPUKo9mypJJGbInKgfiF_fQVNCM';
const bot = new TelegramBot(token, { polling: true });

// Обработчик для команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const keyboard = {
    reply_markup: {
      resize_keyboard: true,
      keyboard: [
        ['🚚 Крупный заказ'],
        ['📦 Мои заказы', '❓ Помощь'],
      ],
    },
  };

  bot.sendMessage(chatId, 'Добро пожаловать в Brooklyn Tuning. Чтобы посмотреть товары, нажмите на синюю кнопку Каталог.', keyboard);
});

const orders = {};
const acceptedOrders = {};
let rejectedOrders = {};

// Обработчик для кнопки "Крупный заказ"
bot.onText(/Крупный заказ/, (msg) => {
  const chatId = msg.chat.id;

  // Шаг 1: Запрашиваем список товаров
  bot.sendMessage(chatId, 'Пожалуйста, пришлите список товаров в формате "Код товара - шт". Например:\nКод товара - 5\nКод товара - 3')
    .then(() => {
      // Ждем ответ от пользователя
      bot.once('message', (message) => {
        const orderList = message.text;

        // Шаг 2: Запрашиваем контактные данные
        bot.sendMessage(chatId, 'Спасибо! Теперь, пожалуйста, пришлите ваши контактные данные: адрес, номер телефона и т.д.')
          .then(() => {
            // Ждем ответ от пользователя
            bot.once('message', (contactMessage) => {
              const contactInfo = contactMessage.text;

              // Шаг 3: Сохраняем заказ
              const orderId = Math.random().toString(36).substring(7);
              if (!orders[chatId]) {
                orders[chatId] = {};
              }
              orders[chatId][orderId] = { orderList, contactInfo, status: 'Заказ на рассмотрении' };

              // Шаг 4: Отправляем подтверждение
              const confirmationMessage = `Ваш заказ:\n${orderList}\n\nКонтактные данные:\n${contactInfo}\n\nМы свяжемся с вами в ближайшее время. Ваш номер заказа: ${orderId}`;
              bot.sendMessage(chatId, confirmationMessage);

              // Здесь вы можете добавить свой код для обработки заказа, например, сохранение в базе данных и т.д.
            });
          });
      });
    });
});

// Обработчик для кнопки "Мои заказы"
bot.onText(/Мои заказы/, (msg) => {
  const chatId = msg.chat.id;

  // Проверяем, есть ли у пользователя заказы
  if (orders[chatId] || acceptedOrders[chatId]) {
    const userOrders = { ...orders[chatId], ...acceptedOrders[chatId] };

    // Отправляем информацию о заказах
    let orderText = 'Ваши заказы:\n\n';
    Object.keys(userOrders).forEach((orderId) => {
      const order = userOrders[orderId];
      orderText += `Номер заказа: ${orderId}\nТовары: ${order.orderList}\nКонтактные данные: ${order.contactInfo}\n\nСтатус: ${order.status || 'pending'}`;
    });

    bot.sendMessage(chatId, orderText);
  } else {
    bot.sendMessage(chatId, 'У вас пока нет заказов.');
  }
});

// Обработчик для кнопки "Помощь"
bot.onText(/Помощь/, (msg) => {
  const chatId = msg.chat.id;
  const helpText = '1️⃣ Для оформления заказа перейдите в раздел "Крупный заказ" и введите код товара, указанный на каждой карточке товара в каталоге. \n2️⃣ После ввода кода, укажите количество штук, которое вы хотите заказать. \n3️⃣ После отправки заказа, ожидайте квитанцию оплаты. \n\n❓ Если у вас возникнут вопросы или вам потребуется помощь, не стесняйтесь связаться с нами по адресу support@brooklyntuning.com.';
  
  bot.sendMessage(chatId, helpText);
});

const adminChatId = '6642451582'; // Замените на ID вашего администратора

// Обработчик для команды "Админпанель"
bot.onText(/\/admin/, (msg) => {
  const chatId = msg.chat.id;

  // Проверяем, является ли пользователь администратором
  if (chatId.toString() !== adminChatId) {
    bot.sendMessage(chatId, 'У вас нет доступа к админ-панели.');
    return;
  }

  // Создаем клавиатуру с разделами админ-панели
  const adminKeyboard = {
    reply_markup: {
      resize_keyboard: true,
      keyboard: [['Заказы', 'Отклоненные'], ['Принятые', 'Настройки бота']],
    },
  };

  bot.sendMessage(chatId, 'Выберите раздел админ-панели:', adminKeyboard);
});

// Обработчик для выбора разделов админ-панели
bot.onText(/^(Заказы|Отклоненные|Принятые|Настройки бота)$/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const section = match[1];

    // Получаем соответствующие заказы в зависимости от выбранного раздела
    let ordersToShow;
    switch (section) {
      case 'Заказы':
        ordersToShow = orders;
        break;
      case 'Отклоненные':
        // Добавьте свой код для получения отклоненных заказов
        ordersToShow = rejectedOrders;
        break;
      case 'Принятые':
        // Добавьте свой код для получения завершенных заказов
        ordersToShow = acceptedOrders; // Замените на реальные данные
        break;
    }

    // Если нет заказов, отправляем сообщение
    if (Object.keys(ordersToShow).length === 0) {
      bot.sendMessage(chatId, `Нет доступных заказов в разделе "${section}".`);
      return;
    }

    // Отправляем заказы администратору
    for (const userId of Object.keys(ordersToShow)) {
      const userOrders = ordersToShow[userId];
      for (const orderId in userOrders) {
        const order = userOrders[orderId];

        // Получение информации о пользователе
        const chat = await bot.getChat(userId);
        const firstName = chat.first_name;
        const username = chat.username;

        // Формирование текста заказа
        const userLink = username ? `@${username}` : 'Нет username';
        const orderText = `Имя пользователя: ${firstName}\nСсылка на пользователя: ${userLink}\nНомер заказа: ${orderId}\nТовары: ${order.orderList}\nКонтактные данные: ${order.contactInfo}`;

        let keyboard;

        // Проверка на раздел "Принятые" - добавляем кнопку "Отправить счет на оплату"
    if (section === 'Принятые') {
      keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Отправить счет на оплату', callback_data: `invoice_${userId}_${orderId}` }],
          ],
        },
      };
    } else {
      // В других разделах не добавляем кнопку "Отправить счет на оплату"
      keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Отклонить', callback_data: `reject_${userId}_${orderId}` }],
            [{ text: 'Принять', callback_data: `accept_${userId}_${orderId}` }],
          ],
        },
      };
    }

        await bot.sendMessage(chatId, orderText, keyboard);
      }
    }
  } catch (error) {
    console.error('Error in admin panel handler:', error);
  }
});

// Обработчик для инлайн-кнопок "Отклонить"
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const [action, userId, orderId] = callbackQuery.data.split('_');

  try {
    // Получение информации о пользователе
    const userChat = await bot.getChat(userId);
    const firstName = userChat.first_name;

    if (action === 'reject') {
      // Переместить заказ в объект rejectedOrders
      if (!rejectedOrders[userId]) {
        rejectedOrders[userId] = {};
      }
      rejectedOrders[userId][orderId] = orders[userId][orderId];

      // Удалить заказ из объекта orders
      delete orders[userId][orderId];

      await bot.editMessageText(`Заказ отклонен.`, { chat_id: chatId, message_id: messageId });
    }
  } catch (error) {
    console.error('Error handling reject callback query:', error);
  }
});

// Обработчик для инлайн-кнопок "Принять"
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const [action, userId, orderId] = callbackQuery.data.split('_');

  try {
    // Получение информации о пользователе
    const userChat = await bot.getChat(userId);
    const firstName = userChat.first_name;

    if (action === 'accept') {
      // Переместить заказ в объект acceptedOrders
      if (!acceptedOrders[userId]) {
        acceptedOrders[userId] = {};
      }
      acceptedOrders[userId][orderId] = orders[userId][orderId];
      acceptedOrders[userId][orderId].status = 'Принят'; // Обновление статуса на "Принят"
    
      // Оповестить пользователя о принятии заказа
      const userChatId = parseInt(userId);
      await bot.sendMessage(userChatId, 'Ваш заказ принят! Мы свяжемся с вами в ближайшее время.');
    
      // Удалить заказ из объекта orders
      delete orders[userId][orderId];
    
      await bot.editMessageText(`Заказ принят`, { chat_id: chatId, message_id: messageId });
    }
  } catch (error) {
    console.error('Error handling accept callback query:', error);
  }
});

// Обработчик для инлайн-кнопки "Отправить счет на оплату"
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const [action, userId, orderId] = callbackQuery.data.split('_');

  try {
    // Получение информации о пользователе
    const userChat = await bot.getChat(userId);
    const firstName = userChat.first_name;

    if (action === 'invoice') {
      // Отправить счет на оплату
      // Реализуйте логику отправки счета на оплату, например, через какой-то API платежной системы
      const invoiceMessage = 'Для оплаты вашего заказа вы можете воспользоваться следующей ссылкой: [Ссылка на оплату]';
      
      // Отправка сообщения с счетом на оплату
      await bot.sendMessage(userId, invoiceMessage);

      // Отправка сообщения администратору об успешной отправке счета
      const adminNotification = `Отправлен счет на оплату для заказа пользователя ${firstName}, номер заказа ${orderId}.`;
      await bot.sendMessage(chatId, adminNotification);

      // Завершение обработки инлайн-кнопки (удаление кнопок из сообщения администратора)
      await bot.editMessageText('', { chat_id: chatId, message_id: messageId });
    }
  } catch (error) {
    console.error('Error handling invoice callback query:', error);
  }
});

// Обработчик для команды "Настройки бота"
bot.onText(/^(Настройки бота)$/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;

    // Создаем клавиатуру с дополнительными настройками
    const settingsKeyboard = {
      reply_markup: {
        resize_keyboard: true,
        keyboard: [
          ['Изменить текст Помощи'],
          ['Изменить ссылку на оплату'], // Добавляем кнопку "Назад" для возвращения к предыдущему меню
        ],
      },
    };

    // Ваш код для обработки настроек бота

    bot.sendMessage(chatId, 'Выберите дополнительные настройки:', settingsKeyboard);
  } catch (error) {
    console.error('Ошибка при обработке команды "Настройки бота":', error);
  }
});





