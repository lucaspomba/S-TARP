// Utilitários
function getUsers(){ return JSON.parse(localStorage.getItem('users') || '[]'); }
function setUsers(u){ localStorage.setItem('users', JSON.stringify(u)); }
function setCurrentUser(u){ localStorage.setItem('currentUser', JSON.stringify(u)); }

// LOGIN
document.getElementById('loginBtn')?.addEventListener('click', ()=>{
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('loginError');

  const user = getUsers().find(u => u.username === username && u.password === password);
  if(!user){ errorMsg.textContent = 'Usuário ou senha inválidos.'; return; }
  setCurrentUser(user);
  window.location.href = 'dashboard.html';
});

// CADASTRO
document.getElementById('registerBtn')?.addEventListener('click', ()=>{
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value;
  const msg = document.getElementById('registerMsg');

  if(!username || !password){ msg.textContent = 'Preencha usuário e senha.'; return; }
  if(password.length < 6){ msg.textContent = 'Senha deve ter ao menos 6 caracteres.'; return; }

  const users = getUsers();
  if(users.some(u => u.username === username)){ msg.textContent = 'Usuário já existe.'; return; }

  users.push({ username, password, role:'Operador' });
  setUsers(users);

  msg.style.color = 'green';
  msg.textContent = 'Cadastro realizado! Redirecionando para login...';
  setTimeout(()=> window.location.href = 'index.html', 1200);
});
