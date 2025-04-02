// ✅ Region Selection (Show/Hide Type Dropdown)
document.addEventListener("DOMContentLoaded", () => {
    const regionSelect = document.getElementById('region');
    const typeSelect = document.getElementById('type');

    if (regionSelect && typeSelect) {
        function fetchFilteredData() {
            const region = regionSelect.value;
            const type = typeSelect.value;
            console.log("Region:", region, "Type:", type);

            if (region) {
                fetchData(region, type);
            }
        }

        regionSelect.addEventListener('change', () => {
            typeSelect.value = "";
            fetchFilteredData();
        });

        typeSelect.addEventListener('change', fetchFilteredData);

        ['services', 'availability', 'minPrice', 'maxPrice'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', fetchFilteredData);
                element.addEventListener('change', fetchFilteredData);
            }
        });

        resetForm();
    }

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
    const detailsDiv = document.getElementById('details');
    const selectedServices = document.getElementById('services').value;
    const selectedAvailability = document.getElementById('availability').value;

    let results = [];
    if (type === 'building') {
        results = data[region].building;
    } else if (type === 'houses') {
        results = data[region].houses;
    } else {
        results = [...data[region].building, ...data[region].houses];
    }

    const minPrice = parseInt(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseInt(document.getElementById('maxPrice').value) || Infinity;

    const filteredResults = results.filter(item => {
        const itemMinPrice = item.price_range?.min || 0;
        const itemMaxPrice = item.price_range?.max || Infinity;

        return itemMinPrice >= minPrice &&
            itemMaxPrice <= maxPrice &&
            (selectedServices === '' || item.services?.includes(selectedServices)) &&
            (selectedAvailability === '' || item.availability === selectedAvailability) &&
            item.availability !== "Sold Out";
    });

    if (filteredResults.length > 0) {
        detailsDiv.innerHTML = filteredResults.map((item) => {
            const selectedType = item.__type || (data[region].building.includes(item) ? 'building' : 'houses');
            const itemIndex = data[region][selectedType].indexOf(item);

            return `
                <li class="list-group-item">
                    <a href="details.html?region=${region}&type=${selectedType}&index=${itemIndex}" class="text-decoration-none">
                        ${item.name}
                    </a>
                </li>
            `;
        }).join('');
    } else {
        detailsDiv.innerHTML = "<p>❌ لا توجد عقارات ضمن المعايير المحددة.</p>";
    }

    document.getElementById('results').style.display = "block";
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
            <p><strong>المساحة:</strong> ${item.area}</p>
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


// ✅ Show Search Results by Name
function showSearchResultsByName() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase(); // الحصول على قيمة البحث وتحويلها إلى حروف صغيرة
    const detailsDiv = document.getElementById('details');
    let results = [];

    // تأكد من أن البيانات تم تحميلها قبل التصفية
    if (!data || Object.keys(data).length === 0) {
        console.log("❌ البيانات غير متاحة.");
        return;
    }

    // تصفية البيانات بناءً على الاسم فقط
    for (const region in data) {
        if (data.hasOwnProperty(region)) {
            results = [
                ...results,
                ...data[region].building.filter(item => item.name.toLowerCase().includes(searchQuery)),
                ...data[region].houses.filter(item => item.name.toLowerCase().includes(searchQuery))
            ];
        }
    }

    // طباعة النتائج في الـ console
    console.log('Search Results:', results);

    // إذا كانت هناك نتائج، عرضها في التفاصيل
    if (results.length > 0) {
        detailsDiv.innerHTML = results.map((item) => {
            return `
                <li class="list-group-item">
                    ${item.name}
                </li>
            `;
        }).join('');
    } else {
        detailsDiv.innerHTML = "<p>❌ لم يتم العثور على مجمعات تتطابق مع الاسم الذي بحثت عنه.</p>";
    }

    // تأكد من ظهور العناصر
    detailsDiv.style.display = "block";
}

// الاستماع لحدث الضغط على مفتاح "Enter" فقط
document.getElementById('searchInput').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        console.log("hello"); // طباعة hello في الـ console
        showSearchResultsByName(); // استدعاء الدالة لإظهار النتائج
    }
    console.log("no");
});
