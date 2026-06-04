let selectedParking = {};

function login() {

    let email = document.getElementById("email").value.trim();
    let password = document.getElementById("password").value.trim();

    if(!email || !password){
        document.getElementById("loginError").innerHTML =
            "Please enter email and password";
        return;
    }

    firebase.auth()
        .signInWithEmailAndPassword(email, password)
        .then(() => {
            showPage("homePage");
        })
        .catch((error) => {
            document.getElementById("loginError").innerHTML =
                error.message;
        });
}
function register() {

    const name =
        document.getElementById("regName").value.trim();

    const phone =
        document.getElementById("regPhone").value.trim();

    const email =
        document.getElementById("regEmail").value.trim();

    const password =
        document.getElementById("regPassword").value.trim();

    console.log("Name:", name);
console.log("Phone:", phone);
console.log("Email:", email);

    if (!name || !phone || !email || !password) {

        document.getElementById("regError").innerHTML =
            "Please fill all fields";

        return;
    }

    firebase.auth()
        .createUserWithEmailAndPassword(email, password)

        .then(async (userCredential) => {

            const uid = userCredential.user.uid;

            await db.collection("users")
                .doc(uid)
                .set({
                    name: name,
                    phone: phone,
                    email: email,
                    createdAt:
                        firebase.firestore.FieldValue.serverTimestamp()
                });

            showPage("homePage");
        })

        .catch((error) => {

            document.getElementById("regError").innerHTML =
                error.message;
        });
}

firebase.auth().onAuthStateChanged((user) => {

    if (user) {

    db.collection("users")
        .doc(user.uid)
        .get()
        .then((doc) => {

            if (doc.exists) {

                const data = doc.data();

                document.getElementById("profileName")
                    .textContent = data.name || "";

                document.getElementById("profilePhone")
                    .textContent = data.phone || "";

                document.getElementById("profileEmail")
                    .textContent = data.email || user.email;
            }
        });

    loadOrders();
    showPage("homePage");
}
    else {

        if (unsubscribeOrders) {
            unsubscribeOrders();
            unsubscribeOrders = null;
        }

        showPage("loginPage");
    }
});

function logout() {

    firebase.auth()
        .signOut()
        .then(() => {

            // 🔥 STEP 3: stop realtime Firestore listener
            if (unsubscribeOrders) {
                unsubscribeOrders();
                unsubscribeOrders = null;
            }

            const profileEmail =
                document.getElementById("profileEmail");

            if (profileEmail) {
                profileEmail.textContent = "";
            }

            showPage("loginPage");

        });
}
 
window.addEventListener("DOMContentLoaded", () => {

    const dateInput = document.getElementById("date");

    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");

        const todayString = `${yyyy}-${mm}-${dd}`;

        dateInput.min = todayString;

        // Automatically select today
        dateInput.value = todayString;
    }
});

function showPage(pageId, btn) {

    document.querySelectorAll(".page")
        .forEach(p => p.classList.remove("active"));

    const page = document.getElementById(pageId);

    if (page) {
        page.classList.add("active");
    }

    // Bottom navigation
    const bottomNav = document.getElementById("bottomNav");

    const hideNavPages = [
        "loginPage",
        "registerPage"
    ];

    if (hideNavPages.includes(pageId)) {
        bottomNav.style.display = "none";
    } else {
        bottomNav.style.display = "flex";
    }

    const navButtons = document.querySelectorAll(".nav-btn");

    navButtons.forEach(b => b.classList.remove("active"));

    if (btn) {
        btn.classList.add("active");
    }

    const pages = {
        homePage: 0,
        ordersPage: 1,
        profilePage: 2
    };

    const index = pages[pageId];

    if (index !== undefined && navButtons[index]) {
        navButtons[index].classList.add("active");
    }
}

function toggleSearchCard() {
    const card = document.getElementById("searchCard");
    const icon = document.getElementById("searchIcon");

    card.classList.toggle("collapsed");

    if (card.classList.contains("collapsed")) {
        icon.textContent = "keyboard_arrow_down";
    } else {
        icon.textContent = "keyboard_arrow_up";
    }
}

function loadParking() {
      const card = document.getElementById("searchCard");
if (!card.classList.contains("collapsed")) {
    toggleSearchCard();
}
    const district =
        document.getElementById("location").value;

    if (!district) {
        alert("Please select a district");
        return;
    }

    const duration =
        Number(document.getElementById("duration").value);

    const parkingList =
        document.getElementById("parkingList");

    parkingList.innerHTML = "Loading...";

    db.collection("parkingAreas")
        .where("district", "==", district)
        .get()
        .then((snapshot) => {

            parkingList.innerHTML = "";

            if (snapshot.empty) {
                parkingList.innerHTML =
                    "No parking available";
                return;
            }

            snapshot.forEach((doc) => {
                const p = doc.data();

                const totalPrice =
                    p.pricePerHour * duration;

                parkingList.innerHTML += `
                    <div class="card">
                        <h3>${p.name}</h3>
                        <p>Available Slots: ${p.availableSlots}</p>
                        <p>₹${p.pricePerHour}/hour</p>
                        <p>Total: ₹${totalPrice}</p>
                        <button onclick="selectParking('${doc.id}', '${p.name}', ${totalPrice})">
                            Book Now
                        </button>
                    </div>
                `;
            });
        });
}

function selectParking(id, name, price) {

    const location = document.getElementById("location")?.value || "";
    const date = document.getElementById("date")?.value || "";
    const startTime = document.getElementById("startTime")?.value || "";
    const duration = document.getElementById("duration")?.value || "";

    selectedParking = {
    parkingId: id,
    area: name,
    price: price,
    location,
    date,
    startTime,
    duration
};

    document.getElementById("detailsContent").innerHTML = `
        <strong>Parking Area:</strong> ${selectedParking.area}<br>
        <strong>Location:</strong> ${selectedParking.location || "Not selected"}<br>
        <strong>Date:</strong> ${selectedParking.date || "Not selected"}<br>
        <strong>Start Time:</strong> ${selectedParking.startTime || "Not selected"}<br>
        <strong>Duration:</strong> ${selectedParking.duration || "Not selected"} hours<br>
        <strong>Price:</strong> ${selectedParking.price}
    `;

    showPage("detailsPage");
}
function confirmBooking() {

    const user = firebase.auth().currentUser;

    if (!user) {
        alert("Please login first");
        return;
    }

    const start = selectedParking.startTime;

        if (!start) {
            alert("Please select start time");
        return;
        }
    const duration = Number(selectedParking.duration);

    const [h, m] = start.split(":").map(Number);

    const startDate = new Date();
    startDate.setHours(h, m, 0, 0);

    const endDate = new Date(
        startDate.getTime() + duration * 60 * 60 * 1000
    );

    const endTime =
        String(endDate.getHours()).padStart(2, "0") +
        ":" +
        String(endDate.getMinutes()).padStart(2, "0");

    db.collection("bookings")
        .add({
            parkingId: selectedParking.parkingId,
            userEmail: user.email,
            area: selectedParking.area,
            location: selectedParking.location,
            date: selectedParking.date,
            startTime: selectedParking.startTime,
            endTime: endTime,
            duration: selectedParking.duration,
            price: selectedParking.price,
            createdAt:
                firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {

            document.getElementById("confirmationContent").innerHTML = `
                <strong>Parking Area:</strong> ${selectedParking.area}<br>
                <strong>Location:</strong> ${selectedParking.location}<br>
                <strong>Date:</strong> ${selectedParking.date}<br>
                <strong>Start Time:</strong> ${selectedParking.startTime}<br>
                <strong>End Time:</strong> ${endTime}<br>
                <strong>Duration:</strong> ${selectedParking.duration} hours<br>
                <strong>Price:</strong> ${selectedParking.price}
            `;

            showPage("confirmationPage");

            setTimeout(() => {
                loadOrders();
            }, 300);
        })
        .catch((error) => {
            alert(error.message);
        });
}

let currentTab = "upcoming";

function setTab(tab) {

    currentTab = tab;

    // reset all tabs
    document.getElementById("upcomingTab").classList.remove("active");
    document.getElementById("completedTab").classList.remove("active");

    // set active
    document.getElementById(tab + "Tab").classList.add("active");

    loadOrders();
}


let unsubscribeOrders = null;

function loadOrders() {

    const user = firebase.auth().currentUser;
    if (!user) return;

    if (unsubscribeOrders) {
        unsubscribeOrders();
    }

    const query = db.collection("bookings")
        .where("userEmail", "==", user.email);

    unsubscribeOrders = query.onSnapshot((snapshot) => {

        let upcoming = "";
        let completed = "";

        const now = new Date(); // current time

        snapshot.forEach((doc) => {

            const b = doc.data();

            // 🔥 combine date + time into real JS Date
            const bookingDateTime = new Date(`${b.date}T${b.startTime}`);

            const html = `
                <div class="card" onclick="showOrderDetails('${doc.id}', '${b.area}', '${b.location}', '${b.date}', '${b.startTime}', '${b.endTime}', '${b.duration}', '${b.price}')">
                    <h3>${b.area}</h3>
                    <p>${b.location}</p>
                    <p>${b.date} - ${b.startTime}</p>
                    <p>₹${b.price}</p>
                </div>
            `;

            if (bookingDateTime >= now) {
                upcoming += html;
            } else {
                completed += html;
            }
        });

        if (currentTab === "upcoming") {
            document.getElementById("orderHistory").innerHTML =
                upcoming || "No upcoming bookings";
        } else {
            document.getElementById("orderHistory").innerHTML =
                completed || "No completed bookings";
        }
    });
}

function showOrderDetails(id, area, location, date, startTime, endTime, duration, price) {

    const html = `
        <h3>${area}</h3>
        <p><strong>Location:</strong> ${location}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Start Time:</strong> ${startTime}</p>
        <p><strong>End Time:</strong> ${endTime}</p>
        <p><strong>Duration:</strong> ${duration} hours</p>
        <p><strong>Price:</strong> ₹${price}</p>
    `;

    // create popup or reuse page
    document.getElementById("orderHistory").innerHTML = `
        <div class="card">
            ${html}
            <button onclick="loadOrders()">Back</button>
        </div>
    `;
}

function generateTimeSlots() {

    const startTime = document.getElementById("startTime");
    const selectedDate = document.getElementById("date").value;

    startTime.innerHTML = "";

    const now = new Date();

    const today =
        now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");

    for (let h = 0; h < 24; h++) {

        for (let m of [0, 15, 30, 45]) {

            if (selectedDate === today) {

                const slotTime = new Date();
                slotTime.setHours(h, m, 0, 0);

                if (slotTime <= now) {
                    continue;
                }
            }

            const hh = String(h).padStart(2, "0");
            const mm = String(m).padStart(2, "0");

            startTime.innerHTML += `
                <option value="${hh}:${mm}">
                    ${hh}:${mm}
                </option>
            `;
        }
    }

    // NEW: calculate end time using the first available slot
    updateEndTime();
}

function toggleTheme() {
    document.body.classList.toggle("dark");

    localStorage.setItem(
        "theme",
        document.body.classList.contains("dark") ? "dark" : "light"
    );
}

window.addEventListener("DOMContentLoaded", () => {
    const theme = localStorage.getItem("theme");

    if (theme === "dark") {
        document.body.classList.add("dark");
    }
});

function updateEndTime() {

    const start = document.getElementById("startTime").value;
    const duration = parseInt(document.getElementById("duration").value);

    if (!start) {
        document.getElementById("endTimePreview").value = "";
        return;
    }

    const [h, m] = start.split(":").map(Number);

    const startDate = new Date();
    startDate.setHours(h, m, 0, 0);

    const endDate = new Date(
        startDate.getTime() + duration * 60 * 60 * 1000
    );

    const endH = String(endDate.getHours()).padStart(2, "0");
    const endM = String(endDate.getMinutes()).padStart(2, "0");

    document.getElementById("endTimePreview").value =
        `${endH}:${endM}`;
}

window.addEventListener("DOMContentLoaded", () => {

    generateTimeSlots();

    document.getElementById("date")
        .addEventListener("change", generateTimeSlots);

    document.getElementById("startTime")
        .addEventListener("change", updateEndTime);

    document.getElementById("duration")
        .addEventListener("change", updateEndTime);
});

function openEditProfile() {

    const user = firebase.auth().currentUser;

    if (!user) return;

    db.collection("users")
        .doc(user.uid)
        .get()
        .then((doc) => {

            if (!doc.exists) return;

            const data = doc.data();

            document.getElementById("editName").value =
                data.name || "";

            document.getElementById("editPhone").value =
                data.phone || "";

            document.getElementById("editEmail").value =
                data.email || "";

            showPage("editProfilePage");
        });
}

function updateProfile() {

    const user = firebase.auth().currentUser;

    if (!user) return;

    const name =
        document.getElementById("editName").value.trim();

    const phone =
        document.getElementById("editPhone").value.trim();

    if (!name || !phone) {
        alert("Please fill all fields");
        return;
    }

    db.collection("users")
        .doc(user.uid)
        .update({
            name: name,
            phone: phone,
            updatedAt:
                firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {

            document.getElementById("profileName")
                .textContent = name;

            document.getElementById("profilePhone")
                .textContent = phone;

            alert("Profile updated successfully");

            showPage("profilePage");
        })
        .catch((error) => {
            alert(error.message);
        });
}

function selectPayMethod(type, el){

    document.querySelectorAll('.pay-tab').forEach(btn=>{
        btn.classList.remove('active');
    });

    el.classList.add('active');

    document.querySelectorAll('.pay-box').forEach(box=>{
        box.classList.remove('active');
    });

    if(type === 'upi'){
        document.getElementById('upiBox').classList.add('active');
    }

    if(type === 'card'){
        document.getElementById('cardBox').classList.add('active');
    }

    if(type === 'wallet'){
        document.getElementById('walletBox').classList.add('active');
    }
}


