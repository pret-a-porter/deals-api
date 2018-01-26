import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as lowdb from 'lowdb';
import * as FileAsync from 'lowdb/adapters/FileAsync';

const app = express();
app.use(bodyParser.json());
const adapter = new FileAsync('db.json');

interface IDeal {
  date: string;
  id: number;
  value: number;
}

lowdb(adapter)
.then(db => {
  app.get('/api/deals', (req, res) => {
    const { date } = req.query;

    if (!date) {
      res.status(400).json({
        error: 'Date is required.',
      });

      return;
    }

    const reqDate = new Date(date);

    if (isNaN(reqDate.getTime())) {
      res.status(400).json({
        error: 'Invalid date.',
      });

      return;
    }

    const from = new Date();
    from.setMinutes(reqDate.getMinutes() - 10);
    let deals = db.get('deals').value();
    deals = deals.filter((item: IDeal) => (new Date(item.date)).getTime() >= from.getTime());

    res.json({
      deals,
    });
  });

  app.put('/api/deal', (req, res) => {
    const {
      date,
      value,
    } = req.body;

    if (typeof value !== 'number') {
      res.status(400).json({
        error: 'Deal value should be a number',
      });

      return;
    }

    if (value <= 0) {
      res.status(400).json({
        error: 'Deal value should be greater than zero',
      });

      return;
    }

    if (!date) {
      res.status(400).json({
        error: 'Date is required.',
      });

      return;
    }

    const newDealDate = new Date(date);

    if (isNaN(newDealDate.getTime())) {
      res.status(400).json({
        error: 'Invalid date.',
      });

      return;
    }

    db.update('idCounter', n => n + 1).write();
    const newDeal = {
      date: newDealDate,
      id: db.get('idCounter').value(),
      value,
    };

    db.get('deals')
    .push(newDeal)
    .write()
    .then(() => {
      res.json({
        deal: newDeal,
      });
    });
  });

  app.delete('/api/deal/:id', (req, res) => {
    const { id } = req.params;

    const deal = db.get('deals').find({ id: Number(id) }).value();

    if (!deal) {
      res.status(400).json({
        error: 'Invalid id. Deal not found.',
      });

      return;
    }

    db.get('deals')
    .remove({
      id: Number(id),
    })
    .write();

    res.status(200).end();
  });

  return db.defaults({
    deals: [],
    idCounter: 0,
  }).write();
})
.then(() => {
  app.listen(process.env.PORT || 3000);
});
