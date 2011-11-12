## COUCHBONE tests

Do a soft link in your _attachments/js directory:

cd _attachments/js

ln -s ../../../couchbone.js couchbone.js

...or copy the file to the _attachments/js dir.

## Deploying this test app

1. Change the top of app-spec.coffee to reflect the correct db name and design doc you want to deploy to.
  
2. Create a .couchapprc file with the settings you need. The `.couchapprc` file should have contents like this:

    {
      "env" : {
        "public" : {
          "db" : "http://name:pass@mycouch.couchone.com/mydatabase"
        },
        "default" : {
          "db" : "http://name:pass@localhost:5984/mydatabase"
        }
      }
    }

 (2b. Also change the _id file to reflect the correct ddoc name) 

3. Now that you have the `.couchapprc` file set up, you can push your app to the CouchDB as simply as:

    couchapp push


## Making changes and adding tests

Make sure to change your database name at the top of the Cakefile.  You can use 'cake watch' and 'cake push' to speed up dev.