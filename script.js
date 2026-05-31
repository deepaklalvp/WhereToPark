let selectedParking = {};

const parkingAreas = [
    {
        name: "Central Parking",
        price: "$10"
    },
    {
        name: "Mall Parking",
        price: "$15"
    },
    {
        name: "Airport Parking",
        price: "$20"
    }
];

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

    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value.trim();

    if (!email || !password) {
        document.getElementById("regError").innerHTML =
            "Please enter email and password";
        return;
    }

    firebase.auth()
        .createUserWithEmailAndPassword(email, password)
        .then(() => {
            showPage("homePage");
        })
        .catch((error) => {
            document.getElementById("regError").innerHTML =
                error.message;
        });
}

firebase.auth().onAuthStateChanged((user) => {

    if (user) {

        const profileEmail =
            document.getElementById("profileEmail");

        if (profileEmail) {
            profileEmail.textContent = user.email;
        }

        loadOrders();
        showPage("homePage");

    } else {

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

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    const minDate = `${yyyy}-${mm}-${dd}`;

    dateInput.min = minDate;
});
function showPage(pageId) {

    document
        .querySelectorAll(".page")
        .forEach(page => page.classList.remove("active"));

    const page = document.getElementById(pageId);

    if(page){
        page.classList.add("active");
    }

 
}

function loadParking() {

    const parkingList =
        document.getElementById("parkingList");

    parkingList.innerHTML = "";

    parkingAreas.forEach(area => {

        parkingList.innerHTML += `
        <div class="parking-item card">
            <h3>${area.name}</h3>
            <p>Price: ${area.price}</p>

            <button onclick="selectParking('${area.name}','${area.price}')">
                View Details
            </button>
        </div>
        `;
    });
}

function selectParking(name, price) {

    const location = document.getElementById("location")?.value || "";
    const date = document.getElementById("date")?.value || "";
    const startTime = document.getElementById("startTime")?.value || "";
    const duration = document.getElementById("duration")?.value || "";

    selectedParking = {
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

    if(!user){
        alert("Please login first");
        return;
    }

    db.collection("bookings")
  .add({
      userEmail: user.email,
      area: selectedParking.area,
      location: selectedParking.location,
      date: selectedParking.date,

      // ✅ NEW STRUCTURE
      startTime: selectedParking.startTime,
      duration: selectedParking.duration,

      price: selectedParking.price,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
  })
      .then(() => {

          document.getElementById("confirmationContent").innerHTML = `
                <strong>Parking Area:</strong> ${selectedParking.area}<br>
                <strong>Location:</strong> ${selectedParking.location}<br>
                <strong>Date:</strong> ${selectedParking.date}<br>
                <strong>Start Time:</strong> ${selectedParking.startTime}<br>
                <strong>Duration:</strong> ${selectedParking.duration} hours<br>
                <strong>Price:</strong> ${selectedParking.price}
            `;

          showPage("confirmationPage");

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
                <div class="card">
                    <h3>${b.area}</h3>
                    <p>${b.location}</p>
                    <p>${b.date} - ${b.startTime} (${b.duration} hrs)</p>
                    <p>${b.price}</p>
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
function generateTimeSlots() {

    const startTime = document.getElementById("startTime");

    let times = [];

    for (let h = 0; h < 24; h++) {
        for (let m of [0, 15, 30, 45]) {

            const hh = String(h).padStart(2, "0");
            const mm = String(m).padStart(2, "0");

            times.push(`${hh}:${mm}`);
        }
    }

    startTime.innerHTML = "";

    times.forEach(t => {
        startTime.innerHTML += `<option value="${t}">${t}</option>`;
    });
}

function updateEndTime() {

    const start = document.getElementById("startTime").value;
    const duration = parseInt(document.getElementById("duration").value);

    if (!start) return;

    const [h, m] = start.split(":").map(Number);

    const startDate = new Date();
    startDate.setHours(h, m, 0, 0);

    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

    const endH = String(endDate.getHours()).padStart(2, "0");
    const endM = String(endDate.getMinutes()).padStart(2, "0");

    document.getElementById("endTimePreview").innerText =
        `Ends at: ${endH}:${endM}`;
}

window.addEventListener("DOMContentLoaded", () => {

    generateTimeSlots();

    document.getElementById("startTime").addEventListener("change", updateEndTime);
    document.getElementById("duration").addEventListener("change", updateEndTime);
});
