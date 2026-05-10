# Максим + Полина

Статичный сайт свадебного приглашения для GitHub Pages.

## Как публиковать

В настройках репозитория GitHub Pages выберите:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

После этого сайт будет доступен по адресу:

`https://andreykrnsov.github.io/maksim-and-apolinary/`

## Именные ссылки

На обычной странице без параметра гостя есть блок «Создать именную ссылку».
Гости, которые открывают ссылку с `?guest=...`, этот блок не видят.

Пример готовой ссылки:

`https://andreykrnsov.github.io/maksim-and-apolinary/?guest=Иван%20и%20Софья#invite`

Также можно вручную использовать параметры `guest`, `guests` или `to`.

## Анкета

GitHub Pages не принимает формы на своей стороне. Без дополнительной настройки анкета:

- проверяет обязательные поля;
- сохраняет последний ответ в браузере гостя;
- формирует готовый текст ответа для копирования или отправки через системное меню.

## Подключение Google Forms

1. Создайте Google Form с такими вопросами:
   - ФИО
   - Будете ли вы присутствовать на свадьбе?
   - Вы останетесь с ночевой?
   - Есть ли предпочтения по алкоголю
   - Трансфер в г. Воткинск
   - Для приглашения
   - Отправлено
2. В форме нажмите `Отправить`, скопируйте ссылку и откройте ее в браузере.
3. Откройте исходный код страницы формы. Проще всего: правый клик, `View page source`.
4. Найдите `formResponse`. Полный адрес вида
   `https://docs.google.com/forms/d/e/.../formResponse` вставьте в `GOOGLE_FORM_ACTION` в `script.js`.
5. В исходном коде рядом с каждым вопросом найдите его `entry.123456789`.
6. Вставьте эти значения в `GOOGLE_FORM_FIELDS` в `script.js`, например:

```js
const GOOGLE_FORM_ACTION = "https://docs.google.com/forms/d/e/FORM_ID/formResponse";
const GOOGLE_FORM_FIELDS = {
  guestName: "entry.111111111",
  attendance: "entry.222222222",
  overnight: "entry.333333333",
  alcohol: "entry.444444444",
  transfer: "entry.555555555",
  invitationFor: "entry.666666666",
  submittedAt: "entry.777777777",
};
```

После этого ответы с формы на сайте будут уходить в Google Form, а в Google Forms
можно открыть вкладку `Ответы` и привязать таблицу Google Sheets.
