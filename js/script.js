// ✅ Region Selection (Show/Hide Type Dropdown)
document.addEventListener("DOMContentLoaded", () => {
    const regionSelect = document.getElementById('region');
    const typeSelect = document.getElementById('type');
    const searchButton = document.getElementById("search");

    if (searchButton) {
        // دالة لاسترجاع القيم الحالية من الفلاتر عند الضغط على الزر
        function fetchFilteredData() {
            const region = regionSelect.value;
            const type = typeSelect.value;
            const services = document.getElementById('services').value;
            const availability = document.getElementById('availability').value;
            const minPrice = document.getElementById('minPrice').value;
            const maxPrice = document.getElementById('maxPrice').value;

            console.log("Region:", region, "Type:", type, "Services:", services, "Availability:", availability, "Price Range:", minPrice, "-", maxPrice);

            if (region) {
                fetchData(region, type, services, availability, minPrice, maxPrice);
            }
        }

        // استدعاء `fetchFilteredData` فقط عند الضغط على زر البحث
        searchButton.addEventListener('click', fetchFilteredData);

        resetForm();
    }

    // معالجة المعلمات من الـ URL
    const urlParams = new URLSearchParams(window.location.search);
    const soldout = urlParams.get('soldout');

    if (soldout) {
        fetchSoldoutDetails(soldout);
    } else {
        const region = urlParams.get('region');
        const type = urlParams.get('type');
        const index = parseInt(urlParams.get('index'), 10);

        if (region && type && !isNaN(index)) {
            fetchDetailsData(region, type, index);
        } else {
            fetchSoldOutData();
        }
    }
});


// ✅ Update Search Results
function updateResults(region, type) {
    try {
        const detailsDiv = document.getElementById('details');
        const selectedServices = document.getElementById('services').value;
        const selectedAvailability = document.getElementById('availability').value;
        const minPrice = parseInt(document.getElementById('minPrice').value) || 0;
        const maxPrice = parseInt(document.getElementById('maxPrice').value) || Infinity;

        // جلب البيانات المناسبة حسب النوع المحدد
        let results = type ? data[region][type] : [...data[region].building, ...data[region].houses];
        console.log(results);
        // تصفية النتائج
        const filteredResults = results.filter(item => filterProperties(item, minPrice, maxPrice, selectedServices, selectedAvailability));

        // تجهيز البيانات لإضافتها إلى `localStorage`
        const resultsToStore = (filteredResults.length > 0 ? filteredResults : results).map(item => ({
            ...item,
            itemIndex: data[region][getSelectedType(region, item)].indexOf(item),
            selectedType: getSelectedType(region, item),
            region
        }));

        // تخزين النتائج في `localStorage`
        localStorage.setItem('filteredResults', JSON.stringify(resultsToStore));
        // التوجيه إلى صفحة النتائج
        window.location.href = "results.html";
        document.getElementById('results').style.display = "block";
    } catch (error) {
        console.error("❌ حدث خطأ أثناء تحديث النتائج:", error);
    }
}

// دالة لتحديد `selectedType` بناءً على موقع العقار
function getSelectedType(region, item) {
    return data[region].building.includes(item) ? 'building' : 'houses';
}

// دالة تصفية مستقلة
function filterProperties(item, minPrice, maxPrice, selectedServices, selectedAvailability) {
    const itemMinPrice = item.price_range?.min || 0;
    const itemMaxPrice = item.price_range?.max || Infinity;

    return (
        itemMinPrice >= minPrice &&
        itemMaxPrice <= maxPrice &&
        (!selectedServices || item.services.includes(selectedServices)) &&
        (!selectedAvailability || item.availability === selectedAvailability) &&
        item.availability !== "Sold Out"
    );
}



// ✅ Data
let data = {};

// ✅ Fetch Data
async function fetchData(region, type) {

    const filesToFetch = [];

    if (type === 'building') {
        filesToFetch.push(`/data/${region}B.json`);
    } else if (type === 'houses') {
        filesToFetch.push(`/data/${region}H.json`);
    } else {
        filesToFetch.push(`/data/${region}B.json`, `/data/${region}H.json`);
    }
    data[region] = { building: [], houses: [] };
    try {
        await Promise.all(filesToFetch.map(async (file) => {
            const response = await fetch(file);
            if (!response.ok) throw new Error(`File not found: ${file}`);
            const fileData = await response.json();

            if (file.includes('B.json')) {
                data[region].building = fileData[region]?.building || [];
            } else if (file.includes('H.json')) {
                data[region].houses = fileData[region]?.houses || [];
            }

        }));
        updateResults(region, type);
    } catch (error) {
        console.error('❌ Error loading JSON file:', error);
        document.getElementById('details').innerHTML = "<p>❌ لم يتم العثور على بيانات.</p>";
        document.getElementById('results').style.display = "none";
    }
}

// ✅ Fetch Property Details
async function fetchDetailsData(region, type, index) {
    const filename = `/data/${region}${type === 'building' ? 'B' : 'H'}.json`;
    try {
        const response = await fetch(filename);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();

        loadPropertyDetails(data, region, type, index);
    } catch (error) {
        console.error(`❌ Error loading JSON file: ${filename}`, error);
    }
}

// ✅ Display Property Details
function loadPropertyDetails(data, region, type, index) {
    const propertyType = type === 'building' ? 'building' : 'houses';
    const item = data[region]?.[propertyType]?.[index];

    if (item) {
        document.getElementById('name').textContent = item.name;
        document.getElementById('info').innerHTML = `
            <p><strong>الموقع:</strong> ${item.location}</p>
            <p><strong>المساحات الخضراء:</strong> ${item.green_spaces}</p>
            <p><strong>إجمالي الوحدات:</strong> ${item.total_units}</p>
            <p><strong>${item.buildings_count !== null ? "عدد المباني" : "إجمالي البيوت"}:</strong> ${item.buildings_count !== null ? item.buildings_count : item.total_houses}</p>
            <p><strong>مساحات الوحدات:</strong> ${item.unit_sizes}</p>
            <p><strong>السعر:</strong> ${item.price_range.min} - ${item.price_range.max} دينار عراقي</p>
            <p><strong>الخدمات:</strong> ${item.services.join(", ")}</p>
            <p><strong>التوافر:</strong> ${item.availability}</p>
            <p><strong>الاتصال:</strong> <a href="tel:${item.contact.phone}">${item.contact.phone}</a></p>
            <p><strong>البريد الإلكتروني:</strong> <a href="mailto:${item.contact.email}">${item.contact.email}</a></p>
            <p><strong>الموقع الإلكتروني:</strong> <a href="${item.contact.website}" target="_blank">${item.contact.website}</a></p>
        `;

        const carouselIndicators = document.getElementById('carousel-indicators');
        const carouselInner = document.getElementById('carousel-inner');

        carouselIndicators.innerHTML = "";
        carouselInner.innerHTML = "";

        item.images.forEach((img, imgIndex) => {
            carouselIndicators.innerHTML += `
                <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="${imgIndex}"
                    ${imgIndex === 0 ? 'class="active" aria-current="true"' : ''} aria-label="Slide ${imgIndex + 1}">
                </button>
            `;

            carouselInner.innerHTML += `
                <div class="carousel-item ${imgIndex === 0 ? 'active' : ''}">
                    <img src="${img}" class="d-block w-100 img-fluid" alt="Property Image">
                </div>
            `;
        });
    } else {
        document.getElementById('info').innerHTML = "<p>❌ لم يتم العثور على تفاصيل لهذا العقار.</p>";
    }
}

// ✅ Reset Form
function resetForm() {
    const regionSelect = document.getElementById('region');
    const typeSelect = document.getElementById('type');
    const resultsDiv = document.getElementById('results');
    const typeSelectionDiv = document.getElementById('typeSelection');

    if (regionSelect) {
        regionSelect.value = "";
        regionSelect.dispatchEvent(new Event("change"));
    }

    if (typeSelect) {
        typeSelect.value = "";
    }

    if (resultsDiv) resultsDiv.style.display = 'none';
    if (typeSelectionDiv) typeSelectionDiv.style.removeProperty("display");
}

// ✅ Handle Back Button
window.addEventListener('pageshow', function (event) {
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        resetForm();
    }
});

// ✅ Fetch and Display Sold Out Properties
async function fetchSoldOutData() {
    try {
        const response = await fetch('/data/soldout.json');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const soldOutData = await response.json();
        displaySoldOutProperties(soldOutData.soldout);
    } catch (error) {
        console.error('❌ Error loading sold out JSON file:', error);
        document.getElementById('soldout-list').innerHTML = "<p>❌ لم يتم العثور على بيانات المجمعات المباعة.</p>";
    }
}

// ✅ Display Sold Out Properties
function displaySoldOutProperties(soldOutProperties) {
    const soldOutList = document.getElementById('soldout-list');
    if (soldOutProperties.length > 0) {
        soldOutList.innerHTML = soldOutProperties.map(item =>
            `<li class="list-group-item">${item.name}</li>`
        ).join('');
    } else {
        soldOutList.innerHTML = "<p>لا توجد مجمعات مباعة حاليًا.</p>";
    }
}

// ✅ Sold Out Section Toggle
document.addEventListener('DOMContentLoaded', () => {
    const soldoutToggle = document.querySelector('.soldout-toggle');
    const soldoutList = document.getElementById('soldout-list');

    if (soldoutToggle && soldoutList) {
        fetchSoldOutData(); // Load sold-out properties only if on main.html

        soldoutToggle.addEventListener('click', () => {
            const isHidden = soldoutList.style.display === 'none' || soldoutList.style.display === '';
            soldoutList.style.display = isHidden ? 'block' : 'none';
            soldoutToggle.classList.toggle('open', isHidden);
        });
    }
});


