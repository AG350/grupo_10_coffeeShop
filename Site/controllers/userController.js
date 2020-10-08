const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require ('path');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const tableName = require ('../database/jsontable');

const { user, category } = require('../database/models');
const usersModel = tableName('users');
const usersTokensModel = tableName('usersTokens');


module.exports = {
    register: (req,res)=>{
        res.render('users/register');
    },
    store: (req,res)=>{
            req.body.password = bcrypt.hashSync(req.body.password_register, 10);
            req.body.email = req.body.email_register;
            
            let newUser = req.body;
            if (req.file) {
                newUser.image = req.file.filename;
            }else{
                newUser.image = 'avatar.png';
            }
            delete newUser.category;
            delete newUser.password_register;
            delete newUser.email_register;
            user.create(newUser,{ include: category })
                .then(getUser=>{
                    return res.render('users/detail', { getUser });
                })
                .catch(error => {
                    console.log(error);
                    return res.render('/');
                  })

            //res.render('');
            res.redirect('login');
    },
    login: (req,res)=>{
        res.render('users/login');
    },
    authenticate: (req, res) => {
        let errors = validationResult(req);

        // Si hay errores en los campos
        if(!errors.isEmpty()) {
            return res.render('users/login', {
                errors: errors.mapped(),
                user: req.body
            })
        }
        user.findOne({
            where: {
                email: req.body.email
            }
        })
        .then(user => {

            // bcrypt.compareSync(req.body.password, user.password)
            // Comparo contraseña - no me funciona registro por eso comparo en texto plano
            if(user && req.body.password === user.password) {
                delete user.password;
                req.session.user = user;

                // Remember me
                // if (req.body.rememberMe) {
                //     const token = crypto.randomBytes(64).toString('base64');
                //     usersTokensModel.create({ userId: user.id, token });
                //     res.cookie('userToken', token, {maxAge: 1000 * 60 * 60 * 24 * 30 * 1})
                // }

                return res.redirect('/');
            } else {
                return res.render('users/login', {
                    errors: { credentials: { msg: 'Crendenciales inválidas' }},
                    user: req.body
                })
            }
        })
        .catch(error => {
            return res.render('users/login', {
                errors: { credentials: { msg: 'Crendenciales inválidas' }},
                user: req.body
            })
        })
        // let user = usersModel.findByField('email', req.body.email);

        // // Si no existe el usuario o la contraseña no es valida
        // if(!user || !bcrypt.compareSync(req.body.password, user.password)) {
        //     return res.render('users/login', {
        //         errors: { credentials: { msg: 'Crendenciales inválidas' }},
        //         user: req.body
        //     })
        // }

        // // Pase los controles, logueo usuario
        // delete user.password
        // req.session.user = user; 

        // //Remember me
        // if (req.body.rememberMe) {
        //     const token = crypto.randomBytes(64).toString('base64');

        //     usersTokensModel.create({ userId: user.id, token });

        //     res.cookie('userToken', token, {maxAge: 1000 * 60 * 60 * 24 * 30 * 1})
        // }
        // return res.redirect('/');
    },
    logout: (req,res)=>{

        let userTokens = usersTokensModel.findAllByField('userId', req.session.user.id);
        userTokens.forEach(userToken => {
            usersTokensModel.delete(userToken.id);
        })

        res.clearCookie('userToken');
        
        req.session.destroy();

        return res.redirect('/');
    },
    list: (req,res)=>{
        user.findAll({ include: category })
            .then(users => {
                return res.render('users/list', { users });
                //return res.send(users);
            })
            .catch(error => {
                console.log(error);
                return res.redirect('/')
            })
    },
    show: (req, res) => {
        user.findByPk(req.params.id,{ include: 'category' })
            .then(getUser=>{
                res.render('users/detail', { getUser });
            })
            .catch(err=>{
                res.render('users/404');
            });
    },
    edit: async (req, res) => {
        const categories = await category.findAll();
        user.findByPk(req.params.id, { include: 'category' })
        .then(getUser => {
            return res.render('users/edit',  { getUser, categories });
        })
        .catch(error => {
            console.log(error);
            return res.redirect('/');
        })
    },
    update: (req, res) => {
        let updatedUser = req.body;
        
        if (req.file) {
            updatedUser.image = req.file.filename;
        } else if (req.body.oldImage) {
            updatedUser.image = req.body.oldImage;
        }
        console.log(updatedUser.oldImage)

        delete updatedUser.oldImage;

        user.update(updatedUser, { where: { id: req.params.id } })
            .then(updatedUser => {
                return res.redirect('/user/' + req.params.id);
            })

    },
    destroy: async (req, res) => {
        let existingUser = await user.findByPk(req.params.id);
        let imagePath = path.join(__dirname, '../public/img/user/' + existingUser.image);

        user.destroy({ where: { id: req.params.id } })
        .then(deletedUser => {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath)
            }

            return res.redirect('/user/list');
        })
        .catch(error => {
            console.log(error);
            return res.render('/');
        })
    },
};