const NOTES_URL = 'http://localhost:3000/notes';

// OBTENER USUARIO DE SESSION O LOCAL Y ASIGNAR DONDE ESTÁ SEÑALADO


async function getNotes() {
    try {
        let res = await fetch(NOTES_URL + '?owner=2'); // CAMBIAR /2 POR ID DE USUARIO TRAIDA DEL LOCAL O SESSION-----------------------------------------------------------
        notes = await res.json();
        return notes
    }
    catch (error) {
        console.log('Error:', error)
    }
}

const content = document.getElementById('myNotes');

//Show user notes
async function showNotes() {
    const notes = await getNotes();


    content.innerHTML = "";
    notes.forEach(note => {
        content.innerHTML += `
                            <div class="card">
                                <div class="card-body">
                                    <h3 class="card-title">${note.title}</h3>
                                    <p class="card-text">${note.content}</p>
                                </div>
                                <div class="card-footer bg-transparent d-flex justify-content-end">
                                    <button class="edit" data-id="${note.id}">Editar Nota</button>
                                    <button class="del" data-id="${note.id}">Eliminar Nota</button>
                                </div>
                            </div>
                                `
    });   
}
showNotes()

// Create new note
async function addNote() {
  // Get all the form data
  const noteTitle = document.getElementById('noteTitle').value.trim();
  const noteBody = document.getElementById('noteBody').value.trim();

  // Validates if any data is missing
  if (!noteTitle || !noteBody) {
    alert('Todos los campos son obligatorios.');
    return;
  }
  try {
    const res = await fetch(NOTES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: noteTitle,
        content: noteBody,
        owner: "2" //Obtener id de usuario de local o session ---------------------------------------------------------------------//////
      }),
    });

    const data = await res.json();

    if (res.ok) {
      // Success message
      alert('Nota creada exitosamente!');
      // Limpiar el formulario
      document.getElementById('createNote').reset();
    } else {
      // Error message
      alert(data.error || 'Error al crear el cliente.');
    }
  } catch (error) {
    console.error('Error en POST:', error);
    alert('Ha ocurrido un error');
  }
}

// Update Note
async function updateNote(noteId) {
  // Get all the form data update
  const noteTitle = document.getElementById('editNoteTitle').value.trim();
  const noteContent = document.getElementById('editNoteBody').value.trim();

  // Validates if any data is missing
  if (!noteTitle || !noteContent) {
    alert('Todos los campos son obligatorios.');
    return;
  }
  try {
    const res = await fetch(`${NOTES_URL}/${noteId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: noteTitle,
        content: noteContent
      }),
    });

    const data = await res.json();

    if (res.ok) {
      // Success message
      alert('Nota actualizada exitosamente!');

      document.getElementById('editNote').reset();
      edit.close();
    } else {
      // Error message
      alert(data.error || 'Error al actualizar la nota.');
    }
  } catch (error) {
    console.error('Error en PUT:', error);
    alert('Ha ocurrido un error');
  }
}

//Show note info for update
async function editNote(noteId) {
    try {
        let res = await fetch(`${NOTES_URL}/${noteId}`);
        let note = await res.json();
        
          document.getElementById('editNoteTitle').value = note.title;
          document.getElementById('editNoteBody').value = note.content;
        setTimeout(() => {
        document.getElementById('editNote').addEventListener('submit', (e) => {
          e.preventDefault();
          updateNote(noteId)
        });
        
        },);
    } catch (error) {
        console.log('Error fetching event data for editing:', error);
    }
}

//Delete Note
async function destroy(noteId) {
  // Check the delete
  if (!confirm("¿Estás seguro de que deseas eliminar esta nota?")) {
    return;
  }

  try {
    const res = await fetch(`${NOTES_URL}/${noteId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      // Success delete message
      console.log('DELETE: Nota eliminada');

      alert('Nota eliminada exitosamente');
    } else {
      // Error message
      const data = await res.json();
      console.error('Error en DELETE:', data.error || 'Error desconocido');
      alert('No se pudo eliminar la nota. Intenta nuevamente.');
    }
  } catch (error) {
    console.error('Error en DELETE:', error);
    alert('Ha ocurrido un error');
  }
}

// Add events
content.addEventListener('click', (e) => {
  if (e.target && e.target.classList.contains('edit')) {
      const id = e.target.dataset.id;
      edit.showModal();
        editNote(id)
  }
  if (e.target && e.target.classList.contains('del')) {
      const id = e.target.dataset.id;
      destroy(id);
  }
});

const create = document.getElementById('createNoteMod');
const edit = document.getElementById('editNoteMod');

document.getElementById('addNote').addEventListener('click', () => {
    create.showModal();
});

document.getElementById('createNote').addEventListener('submit', (e) => {
    e.preventDefault();
    addNote();
});

document.getElementById('closeNote').addEventListener('click', () => {
    create.close();
})

document.getElementById('closeNote1').addEventListener('click', () => {
    edit.close();
})
