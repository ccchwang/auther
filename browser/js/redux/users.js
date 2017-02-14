import axios from 'axios';

/* -----------------    ACTIONS     ------------------ */

const INITIALIZE = 'INITIALIZE_USERS';
const CREATE     = 'CREATE_USER';
export const REMOVE = 'REMOVE_USER';
const UPDATE     = 'UPDATE_USER';
const SET_CURRENT_USER = 'SET_CURRENT_USER';

/* ------------   ACTION CREATORS     ------------------ */

const init  = users => ({ type: INITIALIZE, users });
const create = user  => ({ type: CREATE, user });
const remove = id    => ({ type: REMOVE, id });
const update = user  => ({ type: UPDATE, user });
const setCurrentUser = currentUser => ({ type: SET_CURRENT_USER, currentUser});

/* ------------       REDUCER     ------------------ */

export default function reducer (users = [], action) {
  console.log("INSIDE REDUCER");
  switch (action.type) {

    case INITIALIZE:
      return action.users;

    case CREATE:
      return [action.user, ...users];

    case REMOVE:
      return users.filter(user => user.id !== action.id);

    case UPDATE:
      return users.map(user => (
        action.user.id === user.id ? action.user : user
      ));

    case SET_CURRENT_USER:
      console.log('TAGGGGG', action.currentUser);
      users.currentUser = action.currentUser;
      return users;

    default:
      return users;
  }
}


/* ------------       DISPATCHERS     ------------------ */

export const fetchUsers = () => dispatch => {
  axios.get('/api/users')
       .then(res => dispatch(init(res.data)));
};

// optimistic
export const removeUser = id => dispatch => {
  dispatch(remove(id));
  axios.delete(`/api/users/${id}`)
       .catch(err => console.error(`Removing user: ${id} unsuccesful`, err));
};

export const addUser = user => dispatch => {
  axios.post('/api/users', user)
       .then(res => dispatch(create(res.data)))
       .catch(err => console.error(`Creating user: ${user} unsuccesful`, err));
};

export const updateUser = (id, user) => dispatch => {
  axios.put(`/api/users/${id}`, user)
       .then(res => dispatch(update(res.data)))
       .catch(err => console.error(`Updating user: ${user} unsuccesful`, err));
};

export const findUser = (user) => dispatch => {
  axios.post('/login', user)
    .then(function (results) {
      console.log("YYYYAAAYYY", results);
      dispatch(setCurrentUser(results.data));
    });
};
