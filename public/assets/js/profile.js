const USER_URL = 'http://localhost:3000/users'

// Get user data
async function getUser() {
try {
    let res = await fetch(USER_URL + '/2');
    user = await res.json();
    return user
}
catch (error) {
    console.log('Error:', error)
}
}

// Show profile
async function userProfile() {
    const userData = await getUser()

    // Show name on title
    const profileTitle = document.getElementById('profileName');
    profileTitle.innerText = `PERFIL DE ${userData.fullName.toUpperCase()}`

    // Show user data in inputs
    document.getElementById('nameP').value = userData.fullName;
    document.getElementById('emailP').value = userData.email;

console.log(userData);

}
userProfile()

//Update profile
async function updUser() {
    const userName = document.getElementById('nameP').value.trim();
    const userEmail = document.getElementById('emailP').value.trim();

    if (!userName || !userEmail) {
        return alert('Debes llenar todos los campos')
    }
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailPattern.test(userEmail)) {
      alert('El email no es válido.');
      return;
    }
    const data = {name: userName, email: userEmail}

    await fetch(USER_URL + '/2', { // CAMBIAR /2 POR ID DE USUARIO TRAIDA DEL LOCAL O SESSION-----------------------------------------------------------
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',},
  body: JSON.stringify(data)
})
  .then(response => response.json())
  .then(updatedUser => {
    console.log('Usuario actualizado:', updatedUser);
  })
  .catch(error => {
    console.error('Error al actualizar el usuario:', error);
  });
};

// Save new password
async function updPass() {
    const oldPass = document.getElementById('passwordP').value.trim();
    const newPass = document.getElementById('passwordPn').value.trim();
    
    const userData = await getUser()
    console.log(userData.password)
    if (oldPass != userData.password) {
        alert('La contraseña actual ingresada no coincide con la registrada')
        return
    }
    if (!oldPass || !newPass) {
        return alert('Debes llenar todos los campos')
    }
    if (!newPass) {
        return alert('Debes ingresar una nueva contraseña')
    }
    // VALIDACION DE LOGIN --------------------------------------------------
    if (newPass.length < 6) {
        return alert('La contraseña debe tener más de 6 caracteres')
    }

    const confirmation = confirm('¿Seguro desea actualizar la contraseña?');

    if (!confirmation) {
        return
    }
    const data = {password: newPass}

    await fetch(USER_URL + '/2', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',},
  body: JSON.stringify(data)
})
  .then(response => response.json())
  .then(updatedUser => {
    console.log('Contraseña actualizada');
    alert('Contraseña actualizada')
  })
  .catch(error => {
    console.error('Error al actualizar la contraseña:', error);
  });
};

//Add events
document.getElementById('userInfo').addEventListener('submit', (e) => {
    e.preventDefault();
    updUser();
})
document.getElementById('userPassw').addEventListener('submit', (e) => {
    e.preventDefault();
    updPass();
})