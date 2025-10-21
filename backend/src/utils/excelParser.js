"use strict";

const XLSX = require("xlsx");

function parseExcel(buffer) {
  try {
    console.log("Parsing Excel from buffer, length:", buffer.length);

    if (!buffer || buffer.length === 0) {
      throw new Error("Buffer is empty");
    }

    // Читаем из буфера
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      cellStyles: true,
      raw: false,
    });

    console.log("Sheet names:", workbook.SheetNames);

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("No sheets found in Excel file");
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    // Конвертируем в JSON с заголовками
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log("Parsed data length:", data.length);

    if (data.length > 0) {
      console.log("First row sample:", data[0]);
      console.log("Available columns:", Object.keys(data[0]));
    }

    if (!data || data.length === 0) {
      throw new Error("No data found in Excel sheet");
    }

    // Получаем название проекта из поля "Наименование заказа"
    let projectName = "Проект из Excel";

    console.log("Data structure sample:");
    console.log("Number of rows:", data.length);
    if (data.length > 0) {
      console.log("First row keys:", Object.keys(data[0]));
      console.log("First 3 rows:", data.slice(0, 3));
    }
    // Ищем строку с "Наименование заказа" в разных колонках
    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Проверяем все ячейки в строке
      for (const key in row) {
        const value = row[key];

        // Ищем частичное совпадение с "Наименование заказа" (игнорируем пробелы и двоеточия)
        if (
          value &&
          value
            .toString()
            .trim()
            .replace(/:/g, "")
            .includes("Наименование заказа")
        ) {
          console.log(
            'Found "Наименование заказа" in row:',
            i,
            "column:",
            key,
            "value:",
            value
          );

          // Ищем значение в соседних колонках (справа от найденной ячейки)
          const currentColIndex = parseInt(key.replace("_", ""));
          const valueColKey = `_${currentColIndex + 1}`;
          const valueColKey2 = `_${currentColIndex + 2}`;

          // Проверяем соседние колонки
          if (
            data[i] &&
            data[i][valueColKey] &&
            data[i][valueColKey].toString().trim()
          ) {
            projectName = data[i][valueColKey].toString().trim();
            console.log(
              "Project name found in next column",
              valueColKey,
              ":",
              projectName
            );
            break;
          } else if (
            data[i] &&
            data[i][valueColKey2] &&
            data[i][valueColKey2].toString().trim()
          ) {
            projectName = data[i][valueColKey2].toString().trim();
            console.log(
              "Project name found in column",
              valueColKey2,
              ":",
              projectName
            );
            break;
          }

          // Если не нашли в соседних, пробуем стандартные колонки
          const possibleValueKeys = ["_4", "_3", "_5", "_2", "_6"];
          for (const valueKey of possibleValueKeys) {
            if (
              data[i] &&
              data[i][valueKey] &&
              data[i][valueKey].toString().trim()
            ) {
              projectName = data[i][valueKey].toString().trim();
              console.log(
                "Project name found in column",
                valueKey,
                ":",
                projectName
              );
              break;
            }
          }

          break;
        }
      }

      if (projectName !== "Проект из Excel") break;
    }

    // Альтернативный поиск: ищем по структуре таблицы
    if (projectName === "Проект из Excel") {
      console.log("Trying alternative search...");

      // Ищем строку, где в одной колонке "Наименование заказа", а в соседней - значение
      for (let i = 0; i < data.length; i++) {
        const row = data[i];

        // Проверяем все комбинации колонок
        const columnPairs = [
          { label: "_2", value: "_3" }, // C -> D
          { label: "_3", value: "_4" }, // D -> E (основная)
          { label: "_1", value: "_2" }, // B -> C
          { label: "_4", value: "_5" }, // E -> F
        ];

        for (const pair of columnPairs) {
          if (
            row[pair.label] &&
            row[pair.label].toString().trim() === "Наименование заказа"
          ) {
            if (row[pair.value]) {
              projectName = row[pair.value].toString().trim();
              console.log(
                "Project name found by structure in",
                pair.value,
                ":",
                projectName
              );
              break;
            }
          }
        }

        if (projectName !== "Проект из Excel") break;
      }
    }

    // Если все еще не нашли, выводим отладочную информацию
    if (projectName === "Проект из Excel") {
      console.log("Project name not found. Debug info:");
      console.log("First few rows:", data.slice(0, 10));

      // Ищем любые упоминания "заказа" в данных
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        for (const key in row) {
          const value = row[key];
          if (value && value.toString().includes("заказ")) {
            console.log(
              `Found "заказ" reference at row ${i}, column ${key}:`,
              value
            );
          }
        }
      }
    }

    console.log("Final project name:", projectName);

    // Функция для получения значения из разных возможных названий столбцов
    const getValue = (row, possibleKeys, defaultValue = null) => {
      for (const key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
          return row[key];
        }
      }
      return defaultValue;
    };

    // Функция для преобразования в число (decimal)
    const toDecimal = (value) => {
      if (value === null || value === undefined || value === "") return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    };

    // Функция для преобразования в целое число
    const toInteger = (value) => {
      if (value === null || value === undefined || value === "") return null;
      const num = parseInt(value);
      return isNaN(num) ? null : num;
    };

    // Функция для преобразования в строку
    const toString = (value) => {
      if (value === null || value === undefined) return null;
      return String(value);
    };

    // Функция для создания компонента AreaValues
    const createAreaValues = (single, total) => {
      const singleVal = toDecimal(single);
      const totalVal = toDecimal(total);

      if (singleVal === null && totalVal === null) return null;

      return {
        single: singleVal,
        total: totalVal,
      };
    };

    // Функция для создания компонента FireProtectionAreas
    const createFireProtectionAreas = (row) => {
      const areas = {
        r15: null,
        r45: null,
        r60: null,
        r90: null,
        r120: null,
      };

      // R15
      const r15 = createAreaValues(
        getValue(row, ["_29", "S[м2] под ОГЗ (R15) - для 1 шт"]),
        getValue(row, ["_30", "S[м2] под ОГЗ (R15) - для всех"])
      );
      if (r15) areas.r15 = r15;

      // R45
      const r45 = createAreaValues(
        getValue(row, ["_31", "S[м2] под ОГЗ (R45) - для 1 шт"]),
        getValue(row, ["_32", "S[м2] под ОГЗ (R45) - для всех"])
      );
      if (r45) areas.r45 = r45;

      // R60
      const r60 = createAreaValues(
        getValue(row, ["_34", "S[м2] под ОГЗ (R60) - для 1 шт"]),
        getValue(row, ["_33", "S[м2] под ОГЗ (R60) - для всех"])
      );
      if (r60) areas.r60 = r60;

      // R90
      const r90 = createAreaValues(
        getValue(row, ["_35", "S[м2] под ОГЗ (R90) - для 1 шт"]),
        getValue(row, ["_36", "S[м2] под ОГЗ (R90) - для всех"])
      );
      if (r90) areas.r90 = r90;

      // R120
      const r120 = createAreaValues(
        getValue(row, ["_37", "S[м2] под ОГЗ (120) - для 1 шт"]),
        getValue(row, ["_38", "S[м2] под ОГЗ (R120) - для всех"])
      );
      if (r120) areas.r120 = r120;

      // Удаляем null значения
      Object.keys(areas).forEach((key) => {
        if (areas[key] === null) {
          delete areas[key];
        }
      });

      return Object.keys(areas).length > 0 ? areas : null;
    };

    // Функция для создания компонента FireProtectionAreas для грунта
    const createFireProtectionPrimerAreas = (row) => {
      const areas = {
        r15: null,
        r45: null,
        r60: null,
        r90: null,
        r120: null,
      };

      // R15 грунт
      const r15 = createAreaValues(
        getValue(row, ["_39", "S[м2] грунт под ОГЗ (R15) - для 1 шт"]),
        getValue(row, ["_40", "S[м2] грунт под ОГЗ (R15) - для всех"])
      );
      if (r15) areas.r15 = r15;

      // R45 грунт
      const r45 = createAreaValues(
        getValue(row, ["_41", "S[м2] грунт под ОГЗ (R45) - для 1 шт"]),
        getValue(row, ["_42", "S[м2] грунт под ОГЗ (R45) - для всех"])
      );
      if (r45) areas.r45 = r45;

      // R60 грунт
      const r60 = createAreaValues(
        getValue(row, ["_43", "S[м2] грунт под ОГЗ (R60) - для 1 шт"]),
        getValue(row, ["_44", "S[м2] грунт под ОГЗ (R60) - для всех"])
      );
      if (r60) areas.r60 = r60;

      // R90 грунт
      const r90 = createAreaValues(
        getValue(row, ["_45", "S[м2] грунт под ОГЗ (R90) - для 1 шт"]),
        getValue(row, ["_46", "S[м2] грунт под ОГЗ (R90) - для всех"])
      );
      if (r90) areas.r90 = r90;

      // R120 грунт
      const r120 = createAreaValues(
        getValue(row, ["_47", "S[м2] грунт под ОГЗ (R120) - для 1 шт"]),
        getValue(row, ["_48", "S[м2] грунт под ОГЗ (R120) - для всех"])
      );
      if (r120) areas.r120 = r120;

      // Удаляем null значения
      Object.keys(areas).forEach((key) => {
        if (areas[key] === null) {
          delete areas[key];
        }
      });

      return Object.keys(areas).length > 0 ? areas : null;
    };

    // Фильтруем только строки с элементами (где есть Марка и номер)
    const elementRows = data.filter((row) => {
      const hasMark = getValue(row, ["_3", "Марка"]);
      const orderNumber = getValue(row, ["", "_1", "№", "№ п/п", "ОР"]);
      return hasMark && orderNumber && !isNaN(parseInt(orderNumber));
    });

    console.log("Found element rows:", elementRows.length);

    const elements = elementRows.map((row) => {
      // Формируем габариты из отдельных частей
      const part5 = getValue(row, ["_5"]);
      const part6 = getValue(row, ["_6"]);
      const part7 = getValue(row, ["_7"]);
      const part8 = getValue(row, ["_8"]);
      const part9 = getValue(row, ["_9"]);

      let dimensions = "";
      if (part5 && part7 && part9) {
        dimensions = `${part5}${part6 || " X "}${part7}${part8 || " X "}${part9}`;
      }

      // Преобразуем coatingType в строку
      const coatingTypeValue = getValue(row, [
        "_20",
        "Тип покраски",
        "Тип ЛКП",
      ]);
      const coatingTypeString =
        coatingTypeValue !== null ? String(coatingTypeValue) : null;

      return {
        orderNumber: String(getValue(row, ["", "_1", "№", "№ п/п", "ОР"], "")),
        operation: getValue(row, ["Операция"]),
        rowAndAxis: getValue(row, ["_2", "Ряд и Ось"]),
        brand: getValue(row, ["_3", "Марка"]),
        title: getValue(
          row,
          ["_4", "Название элемента", "Название", "Наименование"],
          "Элемент"
        ),
        dimensions: dimensions,
        mainParameter: getValue(row, [
          "_10",
          "Главный профиль",
          "Главный",
          "Профиль",
        ]),
        number: getValue(row, ["_11", "Номер"]),
        revision: getValue(row, ["_12", "Ревизия чертежа", "Ревизия"]),
        quantity: toInteger(
          getValue(row, ["_13", "Кол. шт.", "Кол.", "Количество"])
        ),
        weightNetSingle: toDecimal(
          getValue(row, ["_14", "Вес нетто - для 1 шт [кг]", "Вес нетто"])
        ),
        weightNetTotal: toDecimal(
          getValue(row, ["_15", "Вес нетто - для всех [кг]"])
        ),
        weightWeldingSingle: toDecimal(
          getValue(row, ["_16", "Вес сварки 1%- для 1 шт [кг]"])
        ),
        weightWeldingTotal: toDecimal(
          getValue(row, ["_17", "Вес сварки 1%- для всех [кг]"])
        ),
        weightTotalSingle: toDecimal(
          getValue(row, ["_18", "Вес ИТОГО со сваркой - для 1 шт [кг]"])
        ),
        weightTotalTotal: toDecimal(
          getValue(row, ["_19", "Вес ИТОГО со сваркой - для всех [кг]"])
        ),
        coatingType: coatingTypeString,
        ralFinish: getValue(row, ["_21", "RAL финишного"]),
        limit: getValue(row, ["_22", "Предел"]),
        areaTotalSingle: toDecimal(
          getValue(row, ["_23", "S(м2) общая марки - для 1 шт"])
        ),
        areaTotalTotal: toDecimal(
          getValue(row, ["_24", "S(м2) общая марки - для всех"])
        ),
        areaUnroundedSingle: toDecimal(
          getValue(row, ["_25", "S(м2) не окр. пов. - для 1 шт"])
        ),
        areaUnroundedTotal: toDecimal(
          getValue(row, ["_26", "S(м2) не окр. пов. - для всех"])
        ),
        areaAkzSingle: toDecimal(
          getValue(row, ["_27", "S(м2) поз АКЗ  - для 1 шт"])
        ),
        areaAkzTotal: toDecimal(
          getValue(row, ["_28", "S(м2) поз АКЗ  - для всех"])
        ),
        areaFireProtection: createFireProtectionAreas(row),
        areaFireProtectionPrimer: createFireProtectionPrimerAreas(row),
        mainElementLength: toDecimal(
          getValue(row, ["_49", "Длина главного элемента [мм]"])
        ),
        weightPerMeter: toDecimal(getValue(row, ["_50", "Вес 1п.м."])),
        constructionType: getValue(row, ["_51", "Тип конструкции"]),
        structure: getValue(row, ["_52", "Структура"]),
      };
    });

    return {
      projectName: projectName,
      elements: elements,
    };
  } catch (error) {
    console.error("Detailed error parsing Excel:", error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}
function parseTechCardExcel(buffer) {
  try {
    console.log("Parsing Tech Card Excel from buffer, length:", buffer.length);

    if (!buffer || buffer.length === 0) {
      throw new Error("Buffer is empty");
    }

    // Читаем из буфера
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      cellStyles: true,
      raw: false,
    });

    console.log("Tech Card Sheet names:", workbook.SheetNames);

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("No sheets found in Excel file");
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    // Получаем все данные из листа
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const data = [];
    
    // Читаем данные построчно
    for (let row = range.s.r; row <= range.e.r; row++) {
      const rowData = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        rowData.push(cell ? cell.v : '');
      }
      data.push(rowData);
    }

    console.log('Tech Card raw data rows:', data.length);

    // Ищем начало таблицы с данными (строка с заголовками)
    let headerRowIndex = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === 'Отправочная марка' || 
          data[i][0]?.toString().includes('Отправочная') ||
          data[i][1]?.toString().includes('Наименование марки')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      // Если не нашли по заголовкам, ищем по структуре данных
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] && data[i][1] && data[i][4] && 
            typeof data[i][4] === 'number' && data[i][4] > 0) {
          headerRowIndex = i - 1; // Предполагаем, что заголовки на строку выше
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      throw new Error("Could not find header row in tech card Excel");
    }

    console.log('Header row index:', headerRowIndex);
    console.log('Header row:', data[headerRowIndex]);

    const techCards = [];
    let currentShippingMark = '';
    let currentMarkName = '';

    // Функция для разделения markName на title и brand
    const splitMarkName = (markName) => {
      if (!markName) {
        return { title: '', brand: '' };
      }

      const markNameStr = markName.toString().trim();
      
      // Разделяем по пробелу - первое слово это title, остальное brand
      const parts = markNameStr.split(' ');
      if (parts.length >= 2) {
        const title = parts[0]; // "Балка"
        const brand = parts.slice(1).join(' '); // "Б1-1"
        return { title, brand };
      } else {
        // Если только одно слово, используем как title
        return { title: markNameStr, brand: '' };
      }
    };

    // Функция для безопасного преобразования в строку
    const toSafeString = (value) => {
      if (value === null || value === undefined || value === '') {
        return '';
      }
      return value.toString();
    };

    // Функция для безопасного преобразования в число
    const toSafeNumber = (value) => {
      if (value === null || value === undefined || value === '') {
        return 0;
      }
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    };

    // Функция для безопасного преобразования в целое число
    const toSafeInteger = (value) => {
      if (value === null || value === undefined || value === '') {
        return 0;
      }
      const num = parseInt(value);
      return isNaN(num) ? 0 : num;
    };

    // Обрабатываем строки начиная со следующей после заголовков
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // Отладочная информация о строке
      console.log(`Row ${i}: [${row[0]}] [${row[1]}] [${row[2]}] [${row[3]}] [${row[4]}]`);

      // Если есть отправочная марка (столбец A) и наименование марки (столбец B)
      if (row[0] && row[0] !== '' && row[1] && row[1] !== '') {
        currentShippingMark = row[0];
        currentMarkName = row[1];
        
        console.log(`Found new mark: ${currentShippingMark} - ${currentMarkName}`);
        
        // Разделяем markName на title и brand
        const { title, brand } = splitMarkName(currentMarkName);
        
        // Это основная запись (балка) - если есть количество в столбце E
        if (row[4] !== undefined && row[4] !== '' && !isNaN(row[4])) {
          console.log(`Creating main tech card for: ${title} ${brand}`);
          const techCard = {
            shippingMark: toSafeString(currentShippingMark),
            markName: toSafeString(currentMarkName),
            partPosition: '', // Основная запись не имеет позиции
            material: toSafeString(row[3]), // Материал может быть указан в основной строке
            quantity: toSafeInteger(row[4]),
            profile: toSafeString(row[5]),
            length: toSafeNumber(row[6]),
            width: toSafeNumber(row[7]),
            height: toSafeNumber(row[8]),
            flangeThickness: toSafeNumber(row[9]),
            wallThickness: toSafeNumber(row[10]),
            steelGrade: toSafeString(row[11]),
            crossSectionArea: toSafeNumber(row[12]),
            sectionPerimeter: toSafeNumber(row[13]),
            straightCutLength: toSafeNumber(row[14]),
            shapedElementsCount: toSafeInteger(row[15]),
            shapedElementsWeight: toSafeNumber(row[16]),
            netWeightSingle: toSafeNumber(row[17]),
            netWeightTotal: toSafeNumber(row[18]),
            grossWeightSingle: toSafeNumber(row[19]),
            grossWeightTotal: toSafeNumber(row[20]),
            millingNetWeightSingle: toSafeNumber(row[21]),
            millingNetWeightTotal: toSafeNumber(row[22]),
            millingGrossWeightSingle: toSafeNumber(row[23]),
            millingGrossWeightTotal: toSafeNumber(row[24]),
            coatingAreaSingle: toSafeNumber(row[25]),
            coatingAreaTotal: toSafeNumber(row[26]),
            layoutAreaSingle: toSafeNumber(row[27]),
            layoutAreaTotal: toSafeNumber(row[28]),
            paintConsumptionSingle: toSafeNumber(row[29]),
            paintConsumptionTotal: toSafeNumber(row[30]),
            holeDiameter: toSafeNumber(row[31]),
            holesPerPart: toSafeInteger(row[32]),
            holesTotal: toSafeInteger(row[33]),
            removedVolumeSingle: toSafeNumber(row[34]),
            removedVolumeTotal: toSafeNumber(row[35])
          };

          // Очищаем пустые значения
          Object.keys(techCard).forEach(key => {
            if (techCard[key] === '' || techCard[key] === null) {
              techCard[key] = undefined;
            }
          });

          techCards.push(techCard);
        }
      }
      // Если НЕТ отправочной марки в столбце A, но есть currentMarkName и есть либо материал, либо позиция, и есть количество
      else if ((!row[0] || row[0] === '') && currentMarkName && 
               ((row[3] && row[3] !== '') || (row[2] && row[2] !== '')) &&
               (row[4] && row[4] !== '' && !isNaN(row[4]))) {
        console.log(`Creating material tech card for: ${currentMarkName}, position: ${row[2]}, material: ${row[3]}, quantity: ${row[4]}`);
        
        // Разделяем markName на title и brand из текущей группы
        const { title, brand } = splitMarkName(currentMarkName);
        
        // Это материал для текущей балки
        const techCard = {
          shippingMark: toSafeString(currentShippingMark),
          markName: toSafeString(currentMarkName),
          partPosition: toSafeString(row[2]), // Конвертируем в строку
          material: toSafeString(row[3]),
          quantity: toSafeInteger(row[4]),
          profile: toSafeString(row[5]),
          length: toSafeNumber(row[6]),
          width: toSafeNumber(row[7]),
          height: toSafeNumber(row[8]),
          flangeThickness: toSafeNumber(row[9]),
          wallThickness: toSafeNumber(row[10]),
          steelGrade: toSafeString(row[11]),
          crossSectionArea: toSafeNumber(row[12]),
          sectionPerimeter: toSafeNumber(row[13]),
          straightCutLength: toSafeNumber(row[14]),
          shapedElementsCount: toSafeInteger(row[15]),
          shapedElementsWeight: toSafeNumber(row[16]),
          netWeightSingle: toSafeNumber(row[17]),
          netWeightTotal: toSafeNumber(row[18]),
          grossWeightSingle: toSafeNumber(row[19]),
          grossWeightTotal: toSafeNumber(row[20]),
          millingNetWeightSingle: toSafeNumber(row[21]),
          millingNetWeightTotal: toSafeNumber(row[22]),
          millingGrossWeightSingle: toSafeNumber(row[23]),
          millingGrossWeightTotal: toSafeNumber(row[24]),
          coatingAreaSingle: toSafeNumber(row[25]),
          coatingAreaTotal: toSafeNumber(row[26]),
          layoutAreaSingle: toSafeNumber(row[27]),
          layoutAreaTotal: toSafeNumber(row[28]),
          paintConsumptionSingle: toSafeNumber(row[29]),
          paintConsumptionTotal: toSafeNumber(row[30]),
          holeDiameter: toSafeNumber(row[31]),
          holesPerPart: toSafeInteger(row[32]),
          holesTotal: toSafeInteger(row[33]),
          removedVolumeSingle: toSafeNumber(row[34]),
          removedVolumeTotal: toSafeNumber(row[35])
        };

        // Очищаем пустые значения
        Object.keys(techCard).forEach(key => {
          if (techCard[key] === '' || techCard[key] === null) {
            techCard[key] = undefined;
          }
        });

        techCards.push(techCard);
      }
    }

    console.log('Parsed tech cards:', techCards.length);

    // Определяем имя проекта из имени файла или данных
    const projectName = extractProjectNameFromTechCard(data) || 'Unknown Project';
    console.log('Detected project name:', projectName);

    return {
      projectName: projectName,
      techCards: techCards
    };

  } catch (error) {
    console.error('Error parsing tech card Excel:', error);
    throw new Error('Failed to parse tech card Excel file: ' + error.message);
  }
}

// Вспомогательная функция для извлечения имени проекта из техкарты
function extractProjectNameFromTechCard(data) {
  // Пытаемся найти имя проекта в первых строках файла
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    // Ищем в каждой ячейке строки
    for (let j = 0; j < row.length; j++) {
      const value = row[j];
      if (value && typeof value === 'string') {
        // Ищем упоминания проекта, названия и т.д.
        if (value.includes('Проект') || 
            value.includes('Project') ||
            value.includes('Наименование') ||
            value.includes('Объект')) {
          // Пытаемся найти значение в соседних ячейках
          if (j + 1 < row.length && row[j + 1]) {
            return String(row[j + 1]).trim();
          }
          if (j > 0 && row[j - 1]) {
            return String(row[j - 1]).trim();
          }
        }
        
        // Если нашли что-то похожее на название проекта (длинная строка без спецсимволов)
        if (value.length > 5 && value.length < 100 && 
            !value.includes('Отправочная') && 
            !value.includes('Наименование марки') &&
            !value.includes('Позиция детали')) {
          return value.trim();
        }
      }
    }
  }
  
  return null;
}

module.exports = {
  parseExcel: parseExcel,
  parseTechCardExcel: parseTechCardExcel
};
