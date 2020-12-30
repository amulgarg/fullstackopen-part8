const { ApolloServer, gql } = require('apollo-server')
const { v1: uuid } = require('uuid');
require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('./models/book');
const Author = require('./models/author');


mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
    .then(() => {
      console.log('connected to MongoDB')
    })
    .catch((error) => {
      console.log('error connection to MongoDB:', error.message)
    })


let authors = [
  {
    name: 'Robert Martin',
    id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
    born: 1952,
  },
  {
    name: 'Martin Fowler',
    id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
    born: 1963
  },
  {
    name: 'Fyodor Dostoevsky',
    id: "afa5b6f1-344d-11e9-a414-719c6709cf3e",
    born: 1821
  },
  { 
    name: 'Joshua Kerievsky', // birthyear not known
    id: "afa5b6f2-344d-11e9-a414-719c6709cf3e",
  },
  { 
    name: 'Sandi Metz', // birthyear not known
    id: "afa5b6f3-344d-11e9-a414-719c6709cf3e",
  },
]

/*
 * Saattaisi olla järkevämpää assosioida kirja ja sen tekijä tallettamalla kirjan yhteyteen tekijän nimen sijaan tekijän id
 * Yksinkertaisuuden vuoksi tallennamme kuitenkin kirjan yhteyteen tekijän nimen
*/

let books = [
  {
    title: 'Clean Code',
    published: 2008,
    author: 'Robert Martin',
    id: "afa5b6f4-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring']
  },
  {
    title: 'Agile software development',
    published: 2002,
    author: 'Robert Martin',
    id: "afa5b6f5-344d-11e9-a414-719c6709cf3e",
    genres: ['agile', 'patterns', 'design']
  },
  {
    title: 'Refactoring, edition 2',
    published: 2018,
    author: 'Martin Fowler',
    id: "afa5de00-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring']
  },
  {
    title: 'Refactoring to patterns',
    published: 2008,
    author: 'Joshua Kerievsky',
    id: "afa5de01-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring', 'patterns']
  },  
  {
    title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
    published: 2012,
    author: 'Sandi Metz',
    id: "afa5de02-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring', 'design']
  },
  {
    title: 'Crime and punishment',
    published: 1866,
    author: 'Fyodor Dostoevsky',
    id: "afa5de03-344d-11e9-a414-719c6709cf3e",
    genres: ['classic', 'crime']
  },
  {
    title: 'The Demon ',
    published: 1872,
    author: 'Fyodor Dostoevsky',
    id: "afa5de04-344d-11e9-a414-719c6709cf3e",
    genres: ['classic', 'revolution']
  },
]

const typeDefs = gql`
  type Author {
    name: String!,
    born: Int,
    bookCount: Int!,
    id: ID!
  }
  type Book {
    title: String!,
    published: Int,
    author: Author,
    genres: [String!]!,
    id: ID!
  }
  type Query {
    bookCount: Int!,
    authorCount: Int!,
    allBooks(author: String, genre: String): [Book!]!,
    allAuthors: [Author!]!
  }
  type Mutation {
    addBook(
      title: String!,
      author: String!,
      published: Int,
      genres: [String!]!
    ): Book,
    editAuthor(
      name: String!
      setBornTo: Int!
    ): Author
  }
`

const resolvers = {
  Query: {
    bookCount: async () => {
      const books = await Book.find({});
      return books.length;
    },
    authorCount: async () => {
      const books = await Author.find({});
      return books.length;
    },
    allBooks: async (root, args) => {
      let booksList = await Book.find({});      
      /* if(args.author){
        booksList = books.filter(book => book.author === args.author)
      } */

      if(args.genre){
        booksList = booksList.filter(book => book.genres.includes(args.genre))
      }

      return booksList;
    },
    allAuthors: async () => {
      const authorsList = await Author.find({});
      return authorsList.map(async (author) => {
        const booksByAuthor = await Book.find({author: author});
        console.log('bookslen', booksByAuthor.length);
        return {
          id: author._id,
          name: author.name,
          bookCount: booksByAuthor.length,
          born: author.born
        }
      });
    }
  },
  Mutation: {
    addBook: async (root, args) => {

      let author = await Author.findOne({name: args.author});
      let authorResult = author;
      console.log('author', author);
      
      if(!author){
        author = new Author({name: args.author});
        authorResult = await author.save();
      }

      console.log('authorResult', authorResult);

      const newBook = new Book({
        title: args.title,
        published: args.published,
        genres: args.genres,
        author: authorResult    
      });
      const newBookResult = await newBook.save();
      return newBook;    
    },

    editAuthor: async (root, args) => {
      const authorToUpdate = await Author.findOne({ name: args.name });

      console.log('authorToUpdate', authorToUpdate);
      
      if(!authorToUpdate){
        return null;
      }

      authorToUpdate.born = args.setBornTo;
      const updatedAuthorResult = await authorToUpdate.save();     

      console.log('updatedAuthorResult', updatedAuthorResult);

      return updatedAuthorResult;
    }
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})


/* query 


query {
  bookCount,
  authorCount,
  allAuthors {
    name,
    bookCount
  },
  allBooks(genre: "classic", author:"Fyodor Dostoevsky"){
    title,
    genres,
    author
  }
}

*/


/* mutation
mutation {
  addBook(
    title: "NoSQL Distilled",
    author: "Martin Fowler",
    published: 2012,
    genres: ["database", "nosql"]
  ) {
    title,
    author
  }
}

mutation {
  editAuthor(name: "Martin Fowler", setBornTo: 1958) {
    name
    born
  }
}

*/