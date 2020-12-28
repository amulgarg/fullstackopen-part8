  
import React, { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client';
import { ALL_AUTHORS, UPDATE_AUTHOR } from '../queries';
import Select from 'react-select';

const Authors = (props) => {
  
  const result = useQuery(ALL_AUTHORS);
  const [ updateWriter ] = useMutation(UPDATE_AUTHOR);
  const [selectedAuthor, setSelectedAuthor] = useState(null);
  const [born, setBorn] = useState('');
  
  if (!props.show) {
    return null
  }
  if (result.loading)  {
    return <div>loading...</div>
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    updateWriter({
      variables: {
        name: selectedAuthor.value,
        setBornTo: parseInt(born, 10)
      }
    })
    setSelectedAuthor(null);
    setBorn('');
  }

  const handleAuthorChange = selectedOption => {
    setSelectedAuthor(selectedOption);
  };

  const authors = result.data.allAuthors;

  return (
    <div>
      <h2>authors</h2>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>
              born
            </th>
            <th>
              books
            </th>
          </tr>
          {authors.map(a =>
            <tr key={a.name}>
              <td>{a.name}</td>
              <td>{a.born}</td>
              <td>{a.bookCount}</td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>Set Birth year</h2>
      <form onSubmit={handleSubmit}>
      <Select
        value={selectedAuthor}
        onChange={handleAuthorChange}
        options={authors.map(author => { return { value: author.name, label: author.name } } )}
      /> <br/>
        born <input type="text" onChange={(event) => setBorn(event.target.value)}/> <br/> <br/>
        <button type='submit'>update author</button>
      </form>

    </div>
  )
}

export default Authors
