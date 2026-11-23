import { config } from "./config.js";
import { calculateEstimate, formatRubles, serviceNames } from "./pricing.js";
import { submitLead, normalizePhone } from "./leads.js";

const $ = (selector) => document.querySelector(selector);
const calculator = $("#calculator");
const callbackDialog = $("#callback-dialog");
const callbackForm = $("#callback-form");
const serviceDialog = $("#service-dialog");
const successDialog = $("#success-dialog");
let selectedService = "drilling";
let validEstimate = null;
let callbackEstimate = null;
let dialogService = "drilling";
const dimensions = {
  drilling: { size: "100", thickness: "20", quantity: "1" },
  cutting: { size: "3", thickness: "20", quantity: "1" },
  demolition: { size: "5", thickness: "12", quantity: "1" },
};

const serviceDetails = {
  drilling: {
    description:
      "Круглые технологические отверстия под вентиляцию, трубопроводы и кабельные трассы. Алмазная коронка выбирается по материалу и заданному диаметру.",
    questions: [
      "Диаметр, глубина и количество отверстий",
      "Материал и расположение скрытых коммуникаций",
      "Доступ к месту бурения, воде и электричеству",
    ],
    note: "Диапазон размеров в калькуляторе демонстрационный. Возможность конкретного бурения уточняется по объекту.",
  },
  cutting: {
    description:
      "Резка бетонных и кирпичных элементов, устройство и расширение проёмов. Сначала согласуем границы реза, способ удаления фрагментов и условия объекта.",
    questions: [
      "Размеры проёма или суммарная длина реза",
      "Толщина, материал и назначение конструкции",
      "Необходимость проекта усиления и согласований",
    ],
    note: "Для несущей стены требуется оценка и проект. Размеры проёма сами по себе не подтверждают допустимость резки.",
  },
  reinforcement: {
    description:
      "Монтаж металлического обрамления проёма по проектному решению. Конструкция усиления и порядок работ определяются для конкретного объекта.",
    questions: [
      "Проект усиления и исходные данные по стене",
      "Размеры существующего или будущего проёма",
      "Порядок резки, монтажа и приёмки работ",
    ],
    note: "Универсальная цена и схема усиления не применяются. Проект, металл и объём монтажа обсуждаются индивидуально.",
  },
  demolition: {
    description:
      "Поэтапный разбор перегородок, санкабин и отдельных конструкций перед ремонтом. Учитываем отделку, соседние элементы и организацию удаления отходов.",
    questions: [
      "Материал, толщина и площадь разбираемой конструкции",
      "Расположение коммуникаций и соседних конструкций",
      "Доступ, допустимое время работы, перенос и вывоз мусора",
    ],
    note: "В демонстрационном калькуляторе приведена упрощённая модель для перегородок. Другие конструкции требуют отдельной оценки.",
  },
};

function updateEstimate() {
  const values = Object.fromEntries(new FormData(calculator));
  const output = $("#estimate-output");
  const error = $("#estimate-error");
  validEstimate = null;
  error.hidden = true;
  try {
    const result = calculateEstimate(values);
    validEstimate = { ...values, ...result };
    output.textContent = result.individual
      ? "По вашему проекту"
      : `${formatRubles(result.low)} – ${formatRubles(result.high)}`;
    $("#result-caption").textContent = result.individual
      ? "Индивидуальный расчёт"
      : "Предварительная демо-оценка";
    $("#result-footnote").textContent = result.individual
      ? "Обсудим исходные данные и проект усиления."
      : "Пример расчёта. Это не утверждённый прайс.";
    $("#estimate-request").textContent = result.individual
      ? "Обсудить усиление"
      : "Обсудить этот расчёт";
    $("#estimate-request").insertAdjacentHTML(
      "beforeend",
      '<svg class="icon"><use href="#i-arrow"/></svg>',
    );
    $("#estimate-request").disabled = false;
  } catch (problem) {
    output.textContent = "Уточните параметры";
    error.textContent = problem.message;
    error.hidden = false;
    $("#result-footnote").textContent =
      "Укажите значения в допустимом диапазоне.";
    $("#estimate-request").disabled = true;
  }
}

function selectService(service, scroll = false) {
  if (!Object.hasOwn(serviceNames, service)) return;
  if (dimensions[selectedService]) {
    dimensions[selectedService] = {
      size: calculator.elements.size.value,
      thickness: calculator.elements.thickness.value,
      quantity: calculator.elements.quantity.value,
    };
  }
  selectedService = service;
  calculator.querySelector(`input[value="${service}"]`).checked = true;
  const individual = service === "reinforcement";
  $("#calculator-fields").hidden = individual;
  $("#individual-note").hidden = !individual;
  for (const name of ["thickness", "size", "quantity"])
    calculator.elements[name].disabled = individual;
  const drilling = service === "drilling";
  $("#quantity-field").hidden = !drilling;
  calculator.elements.quantity.disabled = individual || !drilling;
  $(".size-fields").classList.toggle("two-fields", !drilling);
  $("#size-label").textContent = drilling
    ? "Диаметр, мм"
    : service === "cutting"
      ? "Длина реза, м"
      : "Площадь, м²";
  calculator.elements.size.min = drilling ? "40" : ".1";
  calculator.elements.size.max = drilling ? "400" : "100";
  calculator.elements.size.step = drilling ? "1" : ".1";
  if (!individual)
    for (const [name, value] of Object.entries(dimensions[service]))
      calculator.elements[name].value = value;
  updateEstimate();
  if (scroll)
    $("#estimate").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
}

calculator.addEventListener("input", (event) => {
  if (event.target.name === "service") selectService(event.target.value);
  else updateEstimate();
});
calculator.addEventListener("submit", (event) => event.preventDefault());
document
  .querySelectorAll("[data-select-estimate]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      selectService(button.dataset.selectEstimate, true),
    ),
  );

function openDialog(dialog) {
  document.body.classList.add("dialog-open");
  dialog.showModal();
}
document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("close", () => {
    if (!document.querySelector("dialog[open]"))
      document.body.classList.remove("dialog-open");
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  });
});
document
  .querySelectorAll("[data-close-dialog]")
  .forEach((button) =>
    button.addEventListener("click", () => button.closest("dialog").close()),
  );

function openCallback(estimate = null) {
  callbackEstimate = estimate;
  callbackForm.dataset.source = estimate ? "calculator" : "callback";
  callbackForm.elements.service.value = estimate?.service ?? "consultation";
  const description = $("#callback-description");
  if (estimate) {
    const material = {
      brick: "кирпич",
      concrete: "бетон",
      reinforced: "железобетон",
    }[estimate.material];
    const size =
      estimate.service === "drilling"
        ? `диаметр ${estimate.size} мм, ${estimate.quantity} шт`
        : estimate.service === "cutting"
          ? `длина реза ${estimate.size} м`
          : `площадь ${estimate.size} м²`;
    const text = estimate.individual
      ? "Усиление проёма. Нужен индивидуальный расчёт по проекту."
      : `${serviceNames[estimate.service]}: ${material}, толщина ${estimate.thickness} см, ${size}. Демо-оценка: ${formatRubles(estimate.low)} – ${formatRubles(estimate.high)}.`;
    callbackForm.elements.comment.value = text;
    description.textContent =
      "Параметры расчёта уже добавлены. Вы можете уточнить задачу. Это демо: данные не отправятся.";
  } else {
    callbackForm.elements.comment.value = "";
    description.textContent =
      "Оставьте контакт и короткое описание. Сейчас форма работает в демонстрационном режиме.";
  }
  callbackForm.querySelector(".form-error").hidden = true;
  closeMenu();
  openDialog(callbackDialog);
}
document
  .querySelectorAll("[data-callback]")
  .forEach((button) => button.addEventListener("click", () => openCallback()));
$("#estimate-request").addEventListener("click", () => {
  if (validEstimate) openCallback(validEstimate);
});

document.querySelectorAll("[data-service]").forEach((button) =>
  button.addEventListener("click", () => {
    dialogService = button.dataset.service;
    const detail = serviceDetails[dialogService];
    $("#service-dialog-title").textContent = serviceNames[dialogService];
    $("#service-dialog-description").textContent = detail.description;
    $("#service-dialog-image").src =
      `./assets/service-${{ drilling: "drilling", cutting: "cutting", reinforcement: "reinforcement", demolition: "demolition" }[dialogService]}.svg?v=3`;
    $("#service-dialog-list").replaceChildren(
      ...detail.questions.map((question) => {
        const li = document.createElement("li");
        li.textContent = question;
        return li;
      }),
    );
    $("#service-dialog-note").textContent = detail.note;
    openDialog(serviceDialog);
  }),
);
$("#service-dialog-calculate").addEventListener("click", () => {
  serviceDialog.close();
  selectService(dialogService, true);
});

document.querySelectorAll(".lead-form").forEach((form) => {
  const errorBox = form.querySelector(".form-error");
  let idempotencyKey = null;
  form.addEventListener("input", () => {
    errorBox.hidden = true;
    idempotencyKey = null;
  });
  form.addEventListener("reset", () => {
    idempotencyKey = null;
  });
  form.elements.phone.addEventListener("blur", () => {
    const phone = normalizePhone(form.elements.phone.value);
    if (phone)
      form.elements.phone.value = `${phone.slice(0, 2)} (${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8, 10)}-${phone.slice(10)}`;
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    const originalLabel = button.innerHTML;
    const fields = Object.fromEntries(new FormData(form));
    errorBox.hidden = true;
    button.disabled = true;
    button.textContent = config.DEMO_MODE ? "Проверяем…" : "Отправляем…";
    try {
      idempotencyKey ??= crypto.randomUUID();
      const result = await submitLead(
        {
          ...fields,
          consent: fields.consent === "on",
          source: form.dataset.source,
          estimate:
            form.dataset.source === "calculator" ? callbackEstimate : null,
        },
        { idempotencyKey },
      );
      // TODO(BACKEND): Only a server-confirmed live result may say "received".
      $("#success-title").textContent = result.submitted
        ? "Заявка получена"
        : "Заявка подготовлена";
      $("#success-description").textContent = result.submitted
        ? "Ваша заявка принята. Обсудим задачу по указанному контакту."
        : "Так будет выглядеть завершение заявки. В этой версии ваши данные никуда не отправлены и не сохранены.";
      successDialog.querySelector(".demo-tag").textContent = result.submitted
        ? "Заявка принята"
        : "Демонстрация";
      form.reset();
      callbackEstimate = null;
      if (callbackDialog.open) callbackDialog.close();
      openDialog(successDialog);
    } catch (error) {
      errorBox.textContent =
        error.name === "TimeoutError"
          ? "Сервис не ответил. Попробуйте ещё раз немного позже."
          : error.name === "TypeError"
            ? "Нет связи с сервисом. Проверьте подключение и попробуйте снова."
            : error.message;
      errorBox.hidden = false;
      if (!normalizePhone(fields.phone)) form.elements.phone.focus();
    } finally {
      button.disabled = false;
      button.innerHTML = originalLabel;
    }
  });
});

const menuToggle = $(".menu-toggle");
const mobileNav = $("#mobile-nav");
function closeMenu() {
  mobileNav.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Открыть меню");
}
menuToggle.addEventListener("click", () => {
  const open = mobileNav.hidden;
  mobileNav.hidden = !open;
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
});
mobileNav
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mobileNav.hidden) {
    closeMenu();
    menuToggle.focus();
  }
});
document.addEventListener("click", (event) => {
  if (!mobileNav.hidden && !event.target.closest(".header")) closeMenu();
});
matchMedia("(min-width: 951px)").addEventListener("change", closeMenu);

// Keep the mobile shortcut out of the way while a form or calculator is visible.
const conversionVisibility = new Map();
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries)
      conversionVisibility.set(entry.target.id, entry.isIntersecting);
    $(".mobile-estimate").hidden = [...conversionVisibility.values()].some(
      Boolean,
    );
  },
  { threshold: 0.1 },
);
observer.observe($("#estimate"));
observer.observe($("#contact"));
$("#copyright-year").textContent = new Date().getFullYear();
updateEstimate();
