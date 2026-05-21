export const APP_LANGUAGES = ["uz", "ru", "en"] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = "lang";

const languageToLocale: Record<AppLanguage, string> = {
	uz: "uz-UZ",
	ru: "ru-RU",
	en: "en-US",
};

export const getLocaleByLanguage = (language: AppLanguage) => languageToLocale[language];

export const isAppLanguage = (value: unknown): value is AppLanguage =>
	typeof value === "string" && APP_LANGUAGES.includes(value as AppLanguage);

export type TranslationKey =
	| "search.placeholder"
	| "search.notFound"
	| "search.idLabel"
	| "search.enterHint"
	| "notifications.title"
	| "notifications.empty"
	| "notifications.sectionOpened"
	| "preferences.title"
	| "preferences.theme"
	| "preferences.language"
	| "preferences.languageUz"
	| "preferences.languageRu"
	| "preferences.languageEn"
	| "preferences.fullscreen"
	| "account.title"
	| "account.profile"
	| "account.settings"
	| "navigation.title"
	| "navigation.trips"
	| "navigation.favorites"
	| "auth.logout"
	| "user.fallback"
	| "user.defaultLocation"
	| "subscription.currentPlan"
	| "subscription.startDate"
	| "subscription.endDate"
	| "subscription.contractNumber"
	| "subscription.status"
	| "subscription.active"
	| "subscription.expired"
	| "subscription.daysLeft"
	| "subscription.unassigned"
	| "common.sections"
	| "parent.badge"
	| "parent.panel"
	| "parent.fallbackName"
	| "parent.layoutTitle"
	| "parent.nav.overview"
	| "parent.nav.profile"
	| "parent.nav.grades"
	| "parent.nav.homework"
	| "parent.nav.exams"
	| "parent.nav.support"
	| "parent.nav.notifications"
	| "parent.nav.attendance"
	| "teacher.badge"
	| "teacher.panel"
	| "teacher.fallbackName"
	| "teacher.layoutTitle"
	| "teacher.nav.overview"
	| "teacher.nav.students"
	| "teacher.nav.classes"
	| "teacher.nav.grades"
	| "teacher.nav.homework"
	| "teacher.nav.exams"
	| "teacher.nav.schedule"
	| "teacher.nav.faceAttendance"
	| "teacher.nav.support"
	| "teacher.nav.profile"
	| "student.badge"
	| "student.panel"
	| "student.fallbackName"
	| "student.layoutTitle"
	| "student.nav.overview"
	| "student.nav.schedule"
	| "student.nav.grades"
	| "student.nav.homework"
	| "student.nav.exams"
	| "student.nav.profile"
	| "director.badge"
	| "director.panel"
	| "director.fallbackName"
	| "director.layoutTitle"
	| "director.nav.dashboard"
	| "director.nav.students"
	| "director.nav.teachers"
	| "director.nav.schoolAdmins"
	| "director.nav.classes"
	| "director.nav.schedule"
	| "director.nav.payments"
	| "director.nav.exams"
	| "director.nav.support"
	| "director.nav.settings"
	| "director.studentsList"
	| "director.attachStudent"
	| "director.subscriptionDaysLeft"
	| "director.support.title"
	| "director.support.callAria"
	| "director.support.callDescription"
	| "director.support.telegramAria"
	| "director.support.telegramDescription"
	| "schoolAdmin.badge"
	| "schoolAdmin.fallbackName"
	| "schoolAdmin.layoutTitle"
	| "admin.badge"
	| "admin.panel"
	| "admin.fallbackName"
	| "admin.layoutTitle"
	| "admin.nav.overview"
	| "admin.nav.schools"
	| "admin.nav.users"
	| "admin.nav.subscriptions"
	| "admin.nav.exams"
	| "admin.subscriptionDaysLeft"
	| "dashboard.parent.title"
	| "dashboard.parent.subtitleWithChild"
	| "dashboard.parent.subtitleWithSchool"
	| "dashboard.parent.subtitleDefault"
	| "dashboard.teacher.title"
	| "dashboard.student.title"
	| "dashboard.student.subtitleWithSchool"
	| "dashboard.student.subtitleDefault"
	| "dashboard.admin.title"
	| "dashboard.admin.subtitle";

type TranslationMap = Record<TranslationKey, string>;

export const translations: Record<AppLanguage, TranslationMap> = {
	uz: {
		"search.placeholder": "ID, ism yoki bo'lim qidirish",
		"search.notFound": "Mos bo'lim topilmadi",
		"search.idLabel": "ID",
		"search.enterHint": "Enter",
		"notifications.title": "Bildirishnomalar",
		"notifications.empty": "Hozircha bildirishnoma yo'q",
		"notifications.sectionOpened": "{{section}} bo'limi ochildi",
		"preferences.title": "Sozlamalar",
		"preferences.theme": "Mavzu",
		"preferences.language": "Til",
		"preferences.languageUz": "O'zbek",
		"preferences.languageRu": "Ruscha",
		"preferences.languageEn": "Inglizcha",
		"preferences.fullscreen": "To'liq ekran",
		"account.title": "Akkaunt",
		"account.profile": "Profil",
		"account.settings": "Sozlamalar",
		"navigation.title": "Navigatsiya",
		"navigation.trips": "Mening safarlarim",
		"navigation.favorites": "Sevimlilar",
		"auth.logout": "Chiqish",
		"user.fallback": "Foydalanuvchi",
		"user.defaultLocation": "Toshkent, O'zbekiston",
		"subscription.currentPlan": "Joriy tarif",
		"subscription.startDate": "Boshlanish sanasi",
		"subscription.endDate": "Tugash sanasi",
		"subscription.contractNumber": "Shartnoma raqami",
		"subscription.status": "Holati",
		"subscription.active": "Faol",
		"subscription.expired": "Nofaol",
		"subscription.daysLeft": "{{count}} kun qoldi",
		"subscription.unassigned": "Obuna belgilanmagan",
		"common.sections": "Bo'limlar",
		"parent.badge": "OTA-ONA",
		"parent.panel": "Farzand nazorati paneli",
		"parent.fallbackName": "Ota-ona",
		"parent.layoutTitle": "Ota-ona kabineti",
		"parent.nav.overview": "Umumiy ko'rinish",
		"parent.nav.profile": "Profil",
		"parent.nav.grades": "Baholar",
		"parent.nav.homework": "Uy vazifalari",
		"parent.nav.exams": "Imtihonlar",
		"parent.nav.support": "Murojaat",
		"parent.nav.notifications": "Bildirishnomalar",
		"parent.nav.attendance": "Davomat",
		"teacher.badge": "O'QITUVCHI",
		"teacher.panel": "Darslar boshqaruv paneli",
		"teacher.fallbackName": "O'qituvchi",
		"teacher.layoutTitle": "O'qituvchi kabineti",
		"teacher.nav.overview": "Umumiy ko'rinish",
		"teacher.nav.students": "O'quvchilar",
		"teacher.nav.classes": "Sinflar",
		"teacher.nav.grades": "Baholar",
		"teacher.nav.homework": "Uy vazifasi",
		"teacher.nav.exams": "Imtihon",
		"teacher.nav.schedule": "Dars jadvali",
		"teacher.nav.faceAttendance": "Face ID davomat",
		"teacher.nav.support": "Murojaatlar",
		"teacher.nav.profile": "Profil (Face ID)",
		"student.badge": "O'QUVCHI",
		"student.panel": "O'quvchi kabineti",
		"student.fallbackName": "O'quvchi",
		"student.layoutTitle": "O'quvchi kabineti",
		"student.nav.overview": "Umumiy ko'rinish",
		"student.nav.schedule": "Dars jadvali",
		"student.nav.grades": "Baholar",
		"student.nav.homework": "Uy vazifalari",
		"student.nav.exams": "Imtihonlar",
		"student.nav.profile": "Profil (Face ID)",
		"director.badge": "DIREKTOR",
		"director.panel": "Maktab boshqaruv paneli",
		"director.fallbackName": "Direktor",
		"director.layoutTitle": "Direktor kabineti",
		"director.nav.dashboard": "Boshqaruv paneli",
		"director.nav.students": "O'quvchilar",
		"director.nav.teachers": "O'qituvchilar",
		"director.nav.schoolAdmins": "Maktab adminlari",
		"director.nav.classes": "Sinflar",
		"director.nav.schedule": "Jadval",
		"director.nav.payments": "To'lovlar",
		"director.nav.exams": "Imtihonlar",
		"director.nav.support": "Murojaatlar",
		"director.nav.settings": "Sozlamalar",
		"director.studentsList": "O'quvchilar ro'yxati",
		"director.attachStudent": "O'quvchini biriktirish",
		"director.subscriptionDaysLeft": "{{count}} kun qoldi",
		"director.support.title": "Murojaat uchun",
		"director.support.callAria": "Telefon orqali murojaat",
		"director.support.callDescription": "Telefon orqali murojaat qiling.",
		"director.support.telegramAria": "Telegram orqali murojaat",
		"director.support.telegramDescription": "Telegram orqali murojaat qiling.",
		"schoolAdmin.badge": "MAKTAB ADMINI",
		"schoolAdmin.fallbackName": "Maktab administratori",
		"schoolAdmin.layoutTitle": "Maktab administratori kabineti",
		"admin.badge": "SUPER ADMIN",
		"admin.panel": "Platforma administratorlari",
		"admin.fallbackName": "Admin",
		"admin.layoutTitle": "Platforma administratorlari",
		"admin.nav.overview": "Umumiy ko'rinish",
		"admin.nav.schools": "Maktablar",
		"admin.nav.users": "Foydalanuvchilar",
		"admin.nav.subscriptions": "Obunalar",
		"admin.nav.exams": "Imtihonlar",
		"admin.subscriptionDaysLeft": "{{count}} kun qoldi",
		"dashboard.parent.title": "Ota-ona kabineti",
		"dashboard.parent.subtitleWithChild": "{{child}} ning otasi",
		"dashboard.parent.subtitleWithSchool": "{{school}} • Farzand nazorati",
		"dashboard.parent.subtitleDefault": "Farzandingizning baho va davomatini kuzating",
		"dashboard.teacher.title": "O'qituvchi kabineti",
		"dashboard.student.title": "O'quvchi kabineti",
		"dashboard.student.subtitleWithSchool": "{{school}} • Shaxsiy kabinet",
		"dashboard.student.subtitleDefault": "Shaxsiy kabinet",
		"dashboard.admin.title": "Platforma administratorlari",
		"dashboard.admin.subtitle": "Maktablar, direktorlar va maktab adminlarini boshqarish",
	},
	ru: {
		"search.placeholder": "Поиск по ID, имени или разделу",
		"search.notFound": "Подходящий раздел не найден",
		"search.idLabel": "ID",
		"search.enterHint": "Enter",
		"notifications.title": "Уведомления",
		"notifications.empty": "Пока уведомлений нет",
		"notifications.sectionOpened": "Открыт раздел: {{section}}",
		"preferences.title": "Настройки",
		"preferences.theme": "Тема",
		"preferences.language": "Язык",
		"preferences.languageUz": "Узбекский",
		"preferences.languageRu": "Русский",
		"preferences.languageEn": "Английский",
		"preferences.fullscreen": "Полный экран",
		"account.title": "Аккаунт",
		"account.profile": "Профиль",
		"account.settings": "Настройки",
		"navigation.title": "Навигация",
		"navigation.trips": "Мои поездки",
		"navigation.favorites": "Избранное",
		"auth.logout": "Выйти",
		"user.fallback": "Пользователь",
		"user.defaultLocation": "Ташкент, Узбекистан",
		"subscription.currentPlan": "Текущий тариф",
		"subscription.startDate": "Дата начала",
		"subscription.endDate": "Дата окончания",
		"subscription.contractNumber": "Номер договора",
		"subscription.status": "Статус",
		"subscription.active": "Активен",
		"subscription.expired": "Неактивен",
		"subscription.daysLeft": "Осталось {{count}} дн.",
		"subscription.unassigned": "Подписка не назначена",
		"common.sections": "Разделы",
		"parent.badge": "РОДИТЕЛЬ",
		"parent.panel": "Панель контроля ребенка",
		"parent.fallbackName": "Родитель",
		"parent.layoutTitle": "Кабинет родителя",
		"parent.nav.overview": "Обзор",
		"parent.nav.profile": "Профиль",
		"parent.nav.grades": "Оценки",
		"parent.nav.homework": "Домашние задания",
		"parent.nav.exams": "Экзамены",
		"parent.nav.support": "Обращение",
		"parent.nav.notifications": "Уведомления",
		"parent.nav.attendance": "Посещаемость",
		"teacher.badge": "УЧИТЕЛЬ",
		"teacher.panel": "Панель управления занятиями",
		"teacher.fallbackName": "Учитель",
		"teacher.layoutTitle": "Кабинет учителя",
		"teacher.nav.overview": "Обзор",
		"teacher.nav.students": "Ученики",
		"teacher.nav.classes": "Классы",
		"teacher.nav.grades": "Оценки",
		"teacher.nav.homework": "Домашнее задание",
		"teacher.nav.exams": "Экзамен",
		"teacher.nav.schedule": "Расписание",
		"teacher.nav.faceAttendance": "Посещаемость Face ID",
		"teacher.nav.support": "Обращения",
		"teacher.nav.profile": "Профиль (Face ID)",
		"student.badge": "УЧЕНИК",
		"student.panel": "Кабинет ученика",
		"student.fallbackName": "Ученик",
		"student.layoutTitle": "Кабинет ученика",
		"student.nav.overview": "Обзор",
		"student.nav.schedule": "Расписание",
		"student.nav.grades": "Оценки",
		"student.nav.homework": "Домашние задания",
		"student.nav.exams": "Экзамены",
		"student.nav.profile": "Профиль (Face ID)",
		"director.badge": "ДИРЕКТОР",
		"director.panel": "Панель управления школой",
		"director.fallbackName": "Директор",
		"director.layoutTitle": "Кабинет директора",
		"director.nav.dashboard": "Панель управления",
		"director.nav.students": "Ученики",
		"director.nav.teachers": "Учителя",
		"director.nav.schoolAdmins": "Админы школы",
		"director.nav.classes": "Классы",
		"director.nav.schedule": "Расписание",
		"director.nav.payments": "Платежи",
		"director.nav.exams": "Экзамены",
		"director.nav.support": "Обращения",
		"director.nav.settings": "Настройки",
		"director.studentsList": "Список учеников",
		"director.attachStudent": "Прикрепить ученика",
		"director.subscriptionDaysLeft": "Осталось {{count}} дн.",
		"director.support.title": "Для обращения",
		"director.support.callAria": "Обратиться по телефону",
		"director.support.callDescription": "Свяжитесь по телефону.",
		"director.support.telegramAria": "Обратиться через Telegram",
		"director.support.telegramDescription": "Свяжитесь через Telegram.",
		"schoolAdmin.badge": "АДМИН ШКОЛЫ",
		"schoolAdmin.fallbackName": "Администратор школы",
		"schoolAdmin.layoutTitle": "Кабинет администратора школы",
		"admin.badge": "СУПЕР АДМИН",
		"admin.panel": "Администраторы платформы",
		"admin.fallbackName": "Админ",
		"admin.layoutTitle": "Администраторы платформы",
		"admin.nav.overview": "Обзор",
		"admin.nav.schools": "Школы",
		"admin.nav.users": "Пользователи",
		"admin.nav.subscriptions": "Подписки",
		"admin.nav.exams": "Экзамены",
		"admin.subscriptionDaysLeft": "Осталось {{count}} дн.",
		"dashboard.parent.title": "Кабинет родителя",
		"dashboard.parent.subtitleWithChild": "Родитель: {{child}}",
		"dashboard.parent.subtitleWithSchool": "{{school}} • Контроль ребенка",
		"dashboard.parent.subtitleDefault": "Следите за оценками и посещаемостью ребенка",
		"dashboard.teacher.title": "Кабинет учителя",
		"dashboard.student.title": "Кабинет ученика",
		"dashboard.student.subtitleWithSchool": "{{school}} • Личный кабинет",
		"dashboard.student.subtitleDefault": "Личный кабинет",
		"dashboard.admin.title": "Администраторы платформы",
		"dashboard.admin.subtitle": "Управление школами, директорами и школьными админами",
	},
	en: {
		"search.placeholder": "Search by ID, name, or section",
		"search.notFound": "No matching section found",
		"search.idLabel": "ID",
		"search.enterHint": "Enter",
		"notifications.title": "Notifications",
		"notifications.empty": "No notifications yet",
		"notifications.sectionOpened": "Opened section: {{section}}",
		"preferences.title": "Preferences",
		"preferences.theme": "Theme",
		"preferences.language": "Language",
		"preferences.languageUz": "Uzbek",
		"preferences.languageRu": "Russian",
		"preferences.languageEn": "English",
		"preferences.fullscreen": "Fullscreen",
		"account.title": "Account",
		"account.profile": "Profile",
		"account.settings": "Settings",
		"navigation.title": "Navigation",
		"navigation.trips": "My Trips",
		"navigation.favorites": "Favorites",
		"auth.logout": "Logout",
		"user.fallback": "User",
		"user.defaultLocation": "Tashkent, Uzbekistan",
		"subscription.currentPlan": "Current plan",
		"subscription.startDate": "Start date",
		"subscription.endDate": "End date",
		"subscription.contractNumber": "Contract number",
		"subscription.status": "Status",
		"subscription.active": "Active",
		"subscription.expired": "Expired",
		"subscription.daysLeft": "{{count}} days left",
		"subscription.unassigned": "No subscription assigned",
		"common.sections": "Sections",
		"parent.badge": "PARENT",
		"parent.panel": "Child monitoring panel",
		"parent.fallbackName": "Parent",
		"parent.layoutTitle": "Parent Dashboard",
		"parent.nav.overview": "Overview",
		"parent.nav.profile": "Profile",
		"parent.nav.grades": "Grades",
		"parent.nav.homework": "Homework",
		"parent.nav.exams": "Exams",
		"parent.nav.support": "Support",
		"parent.nav.notifications": "Notifications",
		"parent.nav.attendance": "Attendance",
		"teacher.badge": "TEACHER",
		"teacher.panel": "Class management panel",
		"teacher.fallbackName": "Teacher",
		"teacher.layoutTitle": "Teacher Dashboard",
		"teacher.nav.overview": "Overview",
		"teacher.nav.students": "Students",
		"teacher.nav.classes": "Classes",
		"teacher.nav.grades": "Grades",
		"teacher.nav.homework": "Homework",
		"teacher.nav.exams": "Exam",
		"teacher.nav.schedule": "Schedule",
		"teacher.nav.faceAttendance": "Face ID Attendance",
		"teacher.nav.support": "Support",
		"teacher.nav.profile": "Profile (Face ID)",
		"student.badge": "STUDENT",
		"student.panel": "Student cabinet",
		"student.fallbackName": "Student",
		"student.layoutTitle": "Student Dashboard",
		"student.nav.overview": "Overview",
		"student.nav.schedule": "Schedule",
		"student.nav.grades": "Grades",
		"student.nav.homework": "Homework",
		"student.nav.exams": "Exams",
		"student.nav.profile": "Profile (Face ID)",
		"director.badge": "DIRECTOR",
		"director.panel": "School management panel",
		"director.fallbackName": "Director",
		"director.layoutTitle": "Director Dashboard",
		"director.nav.dashboard": "Dashboard",
		"director.nav.students": "Students",
		"director.nav.teachers": "Teachers",
		"director.nav.schoolAdmins": "School Admins",
		"director.nav.classes": "Classes",
		"director.nav.schedule": "Schedule",
		"director.nav.payments": "Payments",
		"director.nav.exams": "Exams",
		"director.nav.support": "Support",
		"director.nav.settings": "Settings",
		"director.studentsList": "Student list",
		"director.attachStudent": "Attach student",
		"director.subscriptionDaysLeft": "{{count}} days left",
		"director.support.title": "Need help",
		"director.support.callAria": "Contact by phone",
		"director.support.callDescription": "Contact via phone.",
		"director.support.telegramAria": "Contact via Telegram",
		"director.support.telegramDescription": "Contact via Telegram.",
		"schoolAdmin.badge": "SCHOOL ADMIN",
		"schoolAdmin.fallbackName": "School Administrator",
		"schoolAdmin.layoutTitle": "School Admin Dashboard",
		"admin.badge": "SUPER ADMIN",
		"admin.panel": "Platform administrators",
		"admin.fallbackName": "Admin",
		"admin.layoutTitle": "Platform administrators",
		"admin.nav.overview": "Overview",
		"admin.nav.schools": "Schools",
		"admin.nav.users": "Users",
		"admin.nav.subscriptions": "Subscriptions",
		"admin.nav.exams": "Exams",
		"admin.subscriptionDaysLeft": "{{count}} days left",
		"dashboard.parent.title": "Parent Dashboard",
		"dashboard.parent.subtitleWithChild": "Parent of {{child}}",
		"dashboard.parent.subtitleWithSchool": "{{school}} • Child monitoring",
		"dashboard.parent.subtitleDefault": "Track your child's grades and attendance",
		"dashboard.teacher.title": "Teacher Dashboard",
		"dashboard.student.title": "Student Dashboard",
		"dashboard.student.subtitleWithSchool": "{{school}} • Personal dashboard",
		"dashboard.student.subtitleDefault": "Personal dashboard",
		"dashboard.admin.title": "Platform administrators",
		"dashboard.admin.subtitle": "Manage schools, directors, and school admins",
	},
};

const applyVars = (template: string, vars?: Record<string, string | number>) => {
	if (!vars) return template;
	return template.replace(/\{(\w+)\}/g, (_, key: string) => {
		const value = vars[key];
		return value === undefined || value === null ? "" : String(value);
	});
};

export const translate = (
	language: AppLanguage,
	key: TranslationKey,
	vars?: Record<string, string | number>,
) => {
	const template = translations[language][key] || translations.uz[key] || key;
	return applyVars(template, vars);
};
